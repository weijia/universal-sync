import { SyncController } from '../../src/components/SyncController';
import { SyncAdapter, SyncStatus } from '../../src/interfaces/SyncAdapter';
import PouchDB from 'pouchdb';

// 创建模拟适配器类
class MockAdapter implements SyncAdapter {
  name = 'MockAdapter';
  iconUrl = 'https://example.com/mock-icon.png';
  private status: SyncStatus = { status: 'idle' };
  private eventListeners: Record<string, Function[]> = {};
  
  async connect(config: Record<string, any>): Promise<boolean> {
    if (config.shouldFail) {
      this.status = { status: 'error', error: new Error('连接失败') };
      this.dispatchEvent('connect-error', { status: this.status, error: new Error('连接失败') });
      return false;
    }
    
    this.status = { status: 'connected' };
    this.dispatchEvent('connect-success', { status: this.status });
    return true;
  }
  
  async startSync(localDB: PouchDB.Database): Promise<void> {
    this.status = { status: 'syncing', progress: 0 };
    this.dispatchEvent('sync-progress', { status: this.status });
    
    // 模拟同步进度
    setTimeout(() => {
      this.status = { status: 'completed', progress: 100 };
      this.dispatchEvent('sync-complete', { status: this.status });
    }, 100);
  }
  
  stopSync(): void {
    this.status = { status: 'idle' };
    this.dispatchEvent('sync-stopped', { status: this.status });
  }
  
  getSyncStatus(): SyncStatus {
    return this.status;
  }
  
  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }
  
  removeEventListener(event: string, listener: Function): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(l => l !== listener);
  }
  
  private dispatchEvent(event: string, data: any): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach(listener => listener(data));
  }
}

describe('SyncController', () => {
  let controller: SyncController;
  let mockAdapter: MockAdapter;
  let mockDB: PouchDB.Database;
  
  beforeEach(() => {
    // 创建模拟适配器
    mockAdapter = new MockAdapter();
    
    // 创建模拟数据库
    mockDB = new PouchDB('test-db');
    
    // 创建控制器实例
    controller = new SyncController();
    document.body.appendChild(controller);
    
    // 初始化控制器
    controller.initialize({
      adapters: [mockAdapter],
      localDB: mockDB,
      defaultAdapterIndex: 0,
      autoConnect: false
    });
  });
  
  afterEach(() => {
    // 清理DOM
    document.body.removeChild(controller);
    
    // 清理localStorage
    localStorage.clear();
  });
  
  describe('初始化', () => {
    test('应该正确初始化组件', () => {
      const shadow = controller.shadowRoot;
      expect(shadow).toBeTruthy();
      
      // 验证基本结构
      expect(shadow?.querySelector('.sync-container')).toBeTruthy();
      expect(shadow?.querySelector('.sync-adapters')).toBeTruthy();
      expect(shadow?.querySelector('.sync-status')).toBeTruthy();
      expect(shadow?.querySelector('.sync-progress')).toBeTruthy();
    });
    
    test('应该显示适配器列表', () => {
      const adaptersContainer = controller.shadowRoot?.querySelector('.sync-adapters');
      const adapterElements = adaptersContainer?.querySelectorAll('.sync-adapter');
      
      expect(adapterElements?.length).toBe(1);
      expect(adapterElements?.[0].textContent).toContain('MockAdapter');
    });
    
    test('应该选择默认适配器', () => {
      const adapterElement = controller.shadowRoot?.querySelector('.sync-adapter');
      expect(adapterElement?.classList.contains('active')).toBe(true);
    });
  });
  
  describe('适配器选择', () => {
    test('应该切换适配器选择', () => {
      const anotherMockAdapter = new MockAdapter();
      anotherMockAdapter.name = 'AnotherAdapter';
      
      // 重新初始化带有两个适配器
      controller.initialize({
        adapters: [mockAdapter, anotherMockAdapter],
        localDB: mockDB
      });
      
      // 获取适配器元素
      const adapterElements = controller.shadowRoot?.querySelectorAll('.sync-adapter');
      expect(adapterElements?.length).toBe(2);
      
      // 点击第二个适配器
      adapterElements?.[1].dispatchEvent(new MouseEvent('click'));
      
      // 验证选择状态
      expect(adapterElements?.[0].classList.contains('active')).toBe(false);
      expect(adapterElements?.[1].classList.contains('active')).toBe(true);
    });
  });
  
  describe('配置表单', () => {
    test('应该保存和加载配置', () => {
      // 模拟表单提交
      const form = controller.shadowRoot?.querySelector('form');
      const formData = new FormData();
      formData.append('url', 'https://example.com');
      formData.append('username', 'test');
      formData.append('password', 'password');
      
      const submitEvent = new Event('submit');
      Object.defineProperty(submitEvent, 'target', { value: form });
      form?.dispatchEvent(submitEvent);
      
      // 验证本地存储
      const savedConfig = localStorage.getItem(`sync-config-${mockAdapter.name}`);
      expect(savedConfig).toBeTruthy();
      
      // 重新初始化控制器
      controller.initialize({
        adapters: [mockAdapter],
        localDB: mockDB
      });
      
      // 验证配置是否被加载
      const loadedConfig = JSON.parse(localStorage.getItem(`sync-config-${mockAdapter.name}`) || '{}');
      expect(loadedConfig).toEqual(expect.objectContaining({
        url: 'https://example.com',
        username: 'test',
        password: 'password'
      }));
    });
  });
  
  describe('同步操作', () => {
    test('应该开始同步', async () => {
      // 点击同步按钮
      const syncButton = controller.shadowRoot?.querySelector('.sync-button-primary');
      syncButton?.dispatchEvent(new MouseEvent('click'));
      
      // 等待同步完成
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 验证状态更新
      const statusText = controller.shadowRoot?.querySelector('.sync-status-text');
      expect(statusText?.textContent).toBe('同步完成');
    });
    
    test('应该停止同步', async () => {
      // 开始同步
      const syncButton = controller.shadowRoot?.querySelector('.sync-button-primary');
      syncButton?.dispatchEvent(new MouseEvent('click'));
      
      // 点击停止按钮
      const stopButton = controller.shadowRoot?.querySelector('.sync-button-secondary');
      stopButton?.dispatchEvent(new MouseEvent('click'));
      
      // 验证状态更新
      const statusText = controller.shadowRoot?.querySelector('.sync-status-text');
      expect(statusText?.textContent).toBe('空闲');
    });
  });
  
  describe('状态显示', () => {
    test('应该显示连接状态', async () => {
      // 连接适配器
      await mockAdapter.connect({});
      
      // 验证状态显示
      const statusText = controller.shadowRoot?.querySelector('.sync-status-text');
      expect(statusText?.textContent).toBe('已连接');
    });
    
    test('应该显示同步进度', async () => {
      // 连接并开始同步
      await mockAdapter.connect({});
      await mockAdapter.startSync(mockDB);
      
      // 验证进度条
      const progressBar = controller.shadowRoot?.querySelector('.sync-progress-bar');
      expect(progressBar).toBeTruthy();
      
      // 等待同步完成
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 验证进度更新
      expect(progressBar?.style.width).toBe('100%');
    });
    
    test('应该显示错误状态', async () => {
      // 尝试失败的连接
      await mockAdapter.connect({ shouldFail: true });
      
      // 验证错误显示
      const errorMessage = controller.shadowRoot?.querySelector('.sync-error');
      expect(errorMessage?.style.display).toBe('block');
      expect(errorMessage?.textContent).toBe('连接失败');
    });
  });
  
  describe('事件处理', () => {
    test('应该触发自定义事件', () => {
      // 监听自定义事件
      const connectHandler = jest.fn();
      controller.addEventListener('connect-success', connectHandler);
      
      // 连接适配器
      mockAdapter.connect({});
      
      // 验证事件处理
      expect(connectHandler).toHaveBeenCalled();
    });
  });
  
  describe('自动连接', () => {
    test('应该自动连接当启用时', () => {
      // 保存配置
      localStorage.setItem(`sync-config-${mockAdapter.name}`, JSON.stringify({
        url: 'https://example.com',
        username: 'test',
        password: 'password'
      }));
      
      // 重新初始化带有自动连接
      controller.initialize({
        adapters: [mockAdapter],
        localDB: mockDB,
        autoConnect: true
      });
      
      // 验证连接状态
      const statusText = controller.shadowRoot?.querySelector('.sync-status-text');
      expect(statusText?.textContent).toBe('已连接');
    });
  });
});