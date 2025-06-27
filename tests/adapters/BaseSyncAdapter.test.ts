import { BaseSyncAdapter } from '../../src/adapters/BaseSyncAdapter';
import { SyncStatus } from '../../src/interfaces/SyncAdapter';
import PouchDB from 'pouchdb';

// 创建一个BaseSyncAdapter的具体实现用于测试
class TestSyncAdapter extends BaseSyncAdapter {
  readonly name = 'TestAdapter';
  iconUrl = 'https://example.com/icon.png';
  
  private connected = false;
  private syncActive = false;
  
  async connect(config: Record<string, any>): Promise<boolean> {
    try {
      // 模拟连接过程
      if (config.shouldFail) {
        throw new Error('连接失败');
      }
      
      this.connected = true;
      this.updateStatus({ status: 'connected' });
      this.dispatchEvent('connected', { status: this.getSyncStatus() });
      return true;
    } catch (error) {
      this.connected = false;
      this.updateStatus({ 
        status: 'error', 
        error: error instanceof Error ? error : new Error('未知错误') 
      });
      this.dispatchEvent('connection-error', { 
        status: this.getSyncStatus(),
        error: error instanceof Error ? error : new Error('未知错误')
      });
      return false;
    }
  }
  
  async startSync(localDB: PouchDB.Database): Promise<void> {
    if (!this.connected) {
      throw new Error('请先连接');
    }
    
    try {
      this.syncActive = true;
      this.updateStatus({ status: 'syncing', progress: 0 });
      
      // 模拟同步进度
      for (let i = 0; i <= 10; i++) {
        const progress = i * 10;
        this.updateStatus({ progress });
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      this.updateStatus({ status: 'completed', progress: 100 });
      this.dispatchEvent('sync-complete', { status: this.getSyncStatus() });
    } catch (error) {
      this.syncActive = false;
      this.updateStatus({ 
        status: 'error', 
        error: error instanceof Error ? error : new Error('未知错误') 
      });
      throw error;
    }
  }
  
  stopSync(): void {
    if (this.syncActive) {
      this.syncActive = false;
      this.updateStatus({ status: 'idle', progress: 0 });
      this.dispatchEvent('sync-stopped', { status: this.getSyncStatus() });
    }
  }
  
  // 暴露受保护的方法用于测试
  public testDispatchEvent(event: string, data: any): void {
    this.dispatchEvent(event, data);
  }
  
  public testUpdateStatus(status: Partial<SyncStatus>): void {
    this.updateStatus(status);
  }
}

describe('BaseSyncAdapter', () => {
  let adapter: TestSyncAdapter;
  let mockDB: PouchDB.Database;
  
  beforeEach(() => {
    adapter = new TestSyncAdapter();
    mockDB = new PouchDB('test-db');
  });
  
  afterEach(() => {
    adapter.stopSync();
    jest.clearAllMocks();
  });
  
  describe('基本属性', () => {
    test('应该有正确的名称和图标', () => {
      expect(adapter.name).toBe('TestAdapter');
      expect(adapter.iconUrl).toBe('https://example.com/icon.png');
    });
    
    test('应该初始化为空闲状态', () => {
      const status = adapter.getSyncStatus();
      expect(status.status).toBe('idle');
      expect(status.progress).toBeUndefined();
      expect(status.error).toBeUndefined();
    });
  });
  
  describe('事件处理', () => {
    test('应该添加和触发事件监听器', () => {
      const listener = jest.fn();
      adapter.addEventListener('test-event', listener);
      
      adapter.testDispatchEvent('test-event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        type: 'test-event',
        data: 'test'
      });
    });
    
    test('应该移除事件监听器', () => {
      const listener = jest.fn();
      adapter.addEventListener('test-event', listener);
      adapter.removeEventListener('test-event', listener);
      
      adapter.testDispatchEvent('test-event', { data: 'test' });
      
      expect(listener).not.toHaveBeenCalled();
    });
    
    test('应该处理多个事件监听器', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      adapter.addEventListener('test-event', listener1);
      adapter.addEventListener('test-event', listener2);
      
      adapter.testDispatchEvent('test-event', { data: 'test' });
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
    
    test('应该处理监听器错误', () => {
      // 模拟console.error
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('监听器错误');
      });
      
      adapter.addEventListener('test-event', errorListener);
      
      // 不应该抛出错误
      expect(() => {
        adapter.testDispatchEvent('test-event', { data: 'test' });
      }).not.toThrow();
      
      expect(console.error).toHaveBeenCalled();
      expect((console.error as jest.Mock).mock.calls[0][0]).toContain('Error in event listener');
      
      // 恢复console.error
      console.error = originalConsoleError;
    });
  });
  
  describe('状态更新', () => {
    test('应该更新状态', () => {
      adapter.testUpdateStatus({ status: 'syncing', progress: 50 });
      
      const status = adapter.getSyncStatus();
      expect(status.status).toBe('syncing');
      expect(status.progress).toBe(50);
    });
    
    test('应该在状态更新时触发事件', () => {
      const progressListener = jest.fn();
      adapter.addEventListener('sync-progress', progressListener);
      
      adapter.testUpdateStatus({ status: 'syncing', progress: 50 });
      
      expect(progressListener).toHaveBeenCalledTimes(1);
      expect(progressListener.mock.calls[0][0].status.status).toBe('syncing');
      expect(progressListener.mock.calls[0][0].status.progress).toBe(50);
    });
    
    test('应该在错误状态时触发错误事件', () => {
      const errorListener = jest.fn();
      adapter.addEventListener('sync-error', errorListener);
      
      const error = new Error('测试错误');
      adapter.testUpdateStatus({ status: 'error', error });
      
      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener.mock.calls[0][0].status.status).toBe('error');
      expect(errorListener.mock.calls[0][0].error).toBe(error);
    });
  });
  
  describe('连接功能', () => {
    test('应该成功连接', async () => {
      const connectListener = jest.fn();
      adapter.addEventListener('connected', connectListener);
      
      const result = await adapter.connect({});
      
      expect(result).toBe(true);
      expect(adapter.getSyncStatus().status).toBe('connected');
      expect(connectListener).toHaveBeenCalledTimes(1);
    });
    
    test('应该处理连接错误', async () => {
      const errorListener = jest.fn();
      adapter.addEventListener('connection-error', errorListener);
      
      const result = await adapter.connect({ shouldFail: true });
      
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(adapter.getSyncStatus().error?.message).toBe('连接失败');
    });
  });
  
  describe('同步功能', () => {
    beforeEach(async () => {
      await adapter.connect({});
    });
    
    test('应该开始同步并更新进度', async () => {
      const progressListener = jest.fn();
      const completeListener = jest.fn();
      
      adapter.addEventListener('sync-progress', progressListener);
      adapter.addEventListener('sync-complete', completeListener);
      
      await adapter.startSync(mockDB);
      
      expect(progressListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalledTimes(1);
      expect(adapter.getSyncStatus().status).toBe('completed');
      expect(adapter.getSyncStatus().progress).toBe(100);
    });
    
    test('应该停止同步', async () => {
      const stoppedListener = jest.fn();
      adapter.addEventListener('sync-stopped', stoppedListener);
      
      // 开始同步
      const syncPromise = adapter.startSync(mockDB);
      
      // 立即停止
      adapter.stopSync();
      
      await syncPromise;
      
      expect(stoppedListener).toHaveBeenCalledTimes(1);
      expect(adapter.getSyncStatus().status).toBe('idle');
    });
    
    test('应该在未连接时抛出错误', async () => {
      const newAdapter = new TestSyncAdapter();
      await expect(newAdapter.startSync(mockDB)).rejects.toThrow('请先连接');
    });
  });
});