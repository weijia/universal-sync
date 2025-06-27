import { DropboxAdapter, DropboxConfig } from '../../src/adapters/DropboxAdapter';
import PouchDB from 'pouchdb';

// 模拟PouchDB
jest.mock('pouchdb', () => {
  const mockSync = jest.fn().mockReturnValue({
    on: jest.fn().mockImplementation(function(this: any, event: string, callback: Function) {
      if (!this._callbacks) this._callbacks = {};
      this._callbacks[event] = callback;
      return this;
    }),
    cancel: jest.fn()
  });

  return jest.fn().mockImplementation(() => {
    return {
      sync: mockSync,
      close: jest.fn()
    };
  });
});

describe('DropboxAdapter', () => {
  let adapter: DropboxAdapter;
  let mockLocalDB: any;
  
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建适配器实例
    adapter = new DropboxAdapter();
    
    // 创建模拟本地数据库
    mockLocalDB = new PouchDB('test-db');
  });
  
  describe('初始化', () => {
    test('应该正确初始化适配器', () => {
      expect(adapter).toBeInstanceOf(DropboxAdapter);
      expect(adapter.name).toBe('Dropbox');
      expect(adapter.iconUrl).toBe('https://www.dropbox.com/static/images/favicon.ico');
      
      // 初始状态应该是idle
      expect(adapter.getSyncStatus().status).toBe('idle');
    });
  });
  
  describe('连接', () => {
    test('应该成功连接到Dropbox', async () => {
      // 有效的配置
      const config: DropboxConfig = {
        accessToken: 'valid-token',
        remotePath: '/sync',
        autoSyncInterval: 60000
      };
      
      // 监听连接成功事件
      const connectHandler = jest.fn();
      adapter.addEventListener('connected', connectHandler);
      
      // 连接
      const result = await adapter.connect(config);
      
      // 验证结果
      expect(result).toBe(true);
      expect(adapter.getSyncStatus().status).toBe('connected');
      expect(connectHandler).toHaveBeenCalled();
    });
    
    test('应该处理无效的访问令牌', async () => {
      // 无效的配置
      const config: DropboxConfig = {
        accessToken: 'invalid-token',
        remotePath: '/sync'
      };
      
      // 监听连接错误事件
      const errorHandler = jest.fn();
      adapter.addEventListener('connection-error', errorHandler);
      
      // 模拟验证失败
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        throw new Error('Invalid access token');
      });
      
      // 连接
      const result = await adapter.connect(config);
      
      // 验证结果
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0].error.message).toBe('Invalid access token');
    });
    
    test('应该验证远程路径格式', async () => {
      // 无效的远程路径
      const config: DropboxConfig = {
        accessToken: 'valid-token',
        remotePath: '' // 空路径
      };
      
      // 监听连接错误事件
      const errorHandler = jest.fn();
      adapter.addEventListener('connection-error', errorHandler);
      
      // 连接
      const result = await adapter.connect(config);
      
      // 验证结果
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
    });
  });
  
  describe('同步', () => {
    let validConfig: DropboxConfig;
    
    beforeEach(async () => {
      // 有效的配置
      validConfig = {
        accessToken: 'valid-token',
        remotePath: '/sync',
        autoSyncInterval: 60000
      };
      
      // 连接
      await adapter.connect(validConfig);
    });
    
    test('应该开始同步', async () => {
      // 开始同步
      await adapter.startSync(mockLocalDB);
      
      // 验证PouchDB.sync被调用
      expect(mockLocalDB.sync).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('completed');
    });
    
    test('应该处理同步事件', async () => {
      // 监听同步事件
      const completeHandler = jest.fn();
      const errorHandler = jest.fn();
      
      adapter.addEventListener('sync-complete', completeHandler);
      adapter.addEventListener('sync-error', errorHandler);
      
      // 开始同步
      await adapter.startSync(mockLocalDB);
      
      // 获取同步对象的回调
      const syncCallbacks = mockLocalDB.sync()._callbacks;
      
      // 模拟complete事件
      syncCallbacks.complete({});
      
      // 验证完成事件
      expect(completeHandler).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('completed');
      expect(adapter.getSyncStatus().progress).toBe(100);
      
      // 模拟error事件
      const testError = new Error('测试错误');
      syncCallbacks.error(testError);
      
      // 验证错误事件
      expect(errorHandler).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(adapter.getSyncStatus().error).toBeDefined();
    });
    
    test('应该处理自动同步', async () => {
      // 开始同步
      await adapter.startSync(mockLocalDB);
      
      // 验证定时器被设置
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        validConfig.autoSyncInterval
      );
      
      // 停止同步
      adapter.stopSync();
      
      // 验证定时器被清除
      expect(clearInterval).toHaveBeenCalled();
    });
    
    test('应该停止同步', async () => {
      // 开始同步
      await adapter.startSync(mockLocalDB);
      
      // 停止同步
      adapter.stopSync();
      
      // 验证状态
      expect(adapter.getSyncStatus().status).toBe('idle');
      
      // 验证事件触发
      const stopHandler = jest.fn();
      adapter.addEventListener('sync-stopped', stopHandler);
      adapter.stopSync();
      expect(stopHandler).toHaveBeenCalled();
    });
  });
  
  describe('错误处理', () => {
    test('应该处理未连接的情况', async () => {
      // 不先连接就开始同步
      await expect(adapter.startSync(mockLocalDB)).rejects.toThrow('请先连接到Dropbox');
    });
    
    test('应该处理同步过程中的错误', async () => {
      // 连接
      await adapter.connect({
        accessToken: 'valid-token',
        remotePath: '/sync'
      });
      
      // 模拟同步错误
      mockLocalDB.sync.mockImplementationOnce(() => {
        throw new Error('同步失败');
      });
      
      // 监听错误事件
      const errorHandler = jest.fn();
      adapter.addEventListener('sync-error', errorHandler);
      
      // 开始同步
      await adapter.startSync(mockLocalDB);
      
      // 验证错误处理
      expect(errorHandler).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(adapter.getSyncStatus().error?.message).toBe('同步失败');
    });
  });
  
  describe('进度计算', () => {
    test('应该正确计算同步进度', async () => {
      // 连接
      await adapter.connect({
        accessToken: 'valid-token',
        remotePath: '/sync'
      });
      
      // 开始同步
      await adapter.startSync(mockLocalDB);
      
      // 获取同步对象的回调
      const syncCallbacks = mockLocalDB.sync()._callbacks;
      
      // 模拟progress事件
      syncCallbacks.change({
        docs_read: 10,
        docs_written: 5
      });
      
      // 验证进度计算
      expect(adapter.getSyncStatus().progress).toBeDefined();
      expect(adapter.getSyncStatus().progress).toBeLessThanOrEqual(99);
    });
  });
});