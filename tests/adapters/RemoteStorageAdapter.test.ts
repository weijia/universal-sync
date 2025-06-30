import { RemoteStorageAdapter, RemoteStorageConfig } from '../../src/adapters/RemoteStorageAdapter';
import PouchDB from 'pouchdb';

interface TestRemoteStorageAdapter extends RemoteStorageAdapter {
  emit: (event: string, payload?: any) => void;
}

// 模拟定时器
jest.useFakeTimers();

describe('RemoteStorageAdapter', () => {
  let adapter: TestRemoteStorageAdapter;
  let mockDB: PouchDB.Database;
  
  beforeEach(() => {
    adapter = new RemoteStorageAdapter() as TestRemoteStorageAdapter;
    adapter.emit = jest.fn();
    mockDB = new PouchDB('test-db');
    
    // Mock connect方法
    jest.spyOn(adapter, 'connect').mockImplementation(async (config: RemoteStorageConfig) => {
      // 验证用户地址格式
      if (!config.userAddress.includes('@')) {
        throw new Error('Invalid user address');
      }
      
      // 模拟连接过程
      return new Promise((resolve) => {
        setTimeout(() => {
          // 触发connected事件
          const event = { type: 'connected' };
          adapter['emit']('connected', event);
          resolve(true);
        }, 500);
      });
    });
    
    // 模拟PouchDB实例的sync方法
    mockDB.sync = jest.fn().mockImplementation(() => {
      type SyncEvent = 'change' | 'complete';
      type SyncCallback = (info?: any) => void;
      
      const callbacks: Record<SyncEvent, SyncCallback | null> = {
        change: null,
        complete: null
      };
      
      const eventEmitter: {
        on: (event: SyncEvent, callback: SyncCallback) => typeof eventEmitter;
        cancel: () => void;
      } = {
        on: jest.fn((event: SyncEvent, callback: SyncCallback) => {
          callbacks[event] = callback;
          return eventEmitter;
        }),
        cancel: jest.fn(),
      };
      
      // 立即触发change事件模拟同步开始
      if (callbacks.change) {
        callbacks.change({
          docs_read: 0,
          docs_written: 0
        });
        // 确保状态已更新为syncing
        expect(adapter.getSyncStatus().status).toBe('syncing');
      }
      
      // 模拟同步完成
      setTimeout(() => {
        // 再次确认状态为syncing
        expect(adapter.getSyncStatus().status).toBe('syncing');
        
        // 触发change事件报告同步进度
        if (callbacks.change) {
          callbacks.change({
            docs_read: 100,
            docs_written: 100,
            doc_write_failures: 0
          });
        }
        
        // 触发complete事件
        if (callbacks.complete) {
          callbacks.complete();
        }
      }, 50);
      
      return eventEmitter;
    });
  });
  
  afterEach(() => {
    adapter.stopSync();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  
  describe('基本属性', () => {
    test('应该有正确的名称和图标', () => {
      expect(adapter.name).toBe('RemoteStorage');
      expect(adapter.iconUrl).toBe('https://remotestorage.io/img/icon.svg');
    });
  });
  
  describe('连接功能', () => {
    test('应该成功连接到RemoteStorage服务器', async () => {
      jest.setTimeout(30000); // 增加超时时间到30秒
      console.log('开始连接测试'); // 添加调试日志
      const connectSuccessListener = jest.fn();
      adapter.addEventListener('connected', connectSuccessListener);
      
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents'
      };
      
      const connectPromise = adapter.connect(config);
      
      // 推进所有定时器
      jest.runAllTimers();
      
      const result = await connectPromise;
      
      expect(result).toBe(true);
      expect(adapter.getSyncStatus().status).toBe('connected');
      expect(connectSuccessListener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'connected' })
      );
    });
    
    test('应该处理连接错误 - 无效用户地址', async () => {
      const errorListener = jest.fn();
      adapter.addEventListener('connection-error', errorListener);
      
      const config: RemoteStorageConfig = {
        userAddress: 'invalid-address',
        token: 'test-token',
        storageModule: 'documents'
      };
      
      const result = await adapter.connect(config);
      
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toContain('连接失败');
    });
    
    test('应该处理连接错误 - 服务器错误', async () => {
      // 覆盖connect mock以模拟服务器错误
      (adapter.connect as jest.Mock).mockImplementationOnce(async () => {
        throw new Error('服务器错误');
      });
      
      const errorListener = jest.fn();
      adapter.addEventListener('connection-error', errorListener);
      
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents'
      };
      
      const result = await adapter.connect(config);
      
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toBe('服务器错误');
    });

    test('应该拒绝无效的用户地址格式', async () => {
      const config: RemoteStorageConfig = {
        userAddress: 'invalid-address', // 缺少@符号
        token: 'test-token',
        storageModule: 'documents'
      };
      
      await expect(adapter.connect(config)).rejects.toThrow('Invalid user address');
      expect(adapter.getSyncStatus().status).toBe('disconnected');
    });
  });
  
  describe('同步功能', () => {
    beforeEach(async () => {
      // 先连接
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents'
      };
      
      await adapter.connect(config);
      jest.advanceTimersByTime(1000); // 等待连接完成
    });
    
    test('应该开始同步并更新进度', async () => {
      const progressListener = jest.fn();
      const completeListener = jest.fn();
      
      adapter.addEventListener('sync-progress', progressListener);
      adapter.addEventListener('sync-complete', completeListener);
      
      await adapter.startSync(mockDB);
      
      // 快进时间以触发所有进度更新
      for (let i = 0; i <= 10; i++) {
        jest.advanceTimersByTime(200);
      }
      
      // 快进时间以触发同步完成
      jest.advanceTimersByTime(100);
      
      expect(progressListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('completed');
      expect(adapter.getSyncStatus().progress).toBe(100);
    });
    
    test('应该设置自动同步', async () => {
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents',
        autoSyncInterval: 5000
      };
      
      await adapter.connect(config);
      jest.advanceTimersByTime(1000); // 等待连接完成
      
      await adapter.startSync(mockDB);
      
      // 快进一次自动同步间隔
      jest.advanceTimersByTime(5000);
      
      // 检查状态应为completed - 同步操作应该是即时的
      expect(adapter.getSyncStatus().status).toBe('completed');

      // 再次快进
      jest.advanceTimersByTime(5000);
      
      // 应该再次触发同步
      expect(adapter.getSyncStatus().status).toBe('completed');
    });
    
    test('应该停止同步', async () => {
      const stoppedListener = jest.fn();
      adapter.addEventListener('sync-stopped', stoppedListener);
      
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents',
        autoSyncInterval: 5000
      };
      
      await adapter.connect(config);
      jest.advanceTimersByTime(1000); // 等待连接完成
      
      await adapter.startSync(mockDB);
      
      adapter.stopSync();
      
      expect(stoppedListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('idle');
      
      // 快进一次自动同步间隔
      jest.advanceTimersByTime(5000);
      
      // 不应该触发额外的同步
      expect(adapter.getSyncStatus().status).toBe('idle');
    });
  });
  
  describe('错误处理', () => {
    test('应该处理同步错误', async () => {
      // 重新模拟mockDB.sync抛出错误
      mockDB.sync = jest.fn().mockImplementation(() => {
        throw new Error('同步失败');
      });
      
      const errorListener = jest.fn();
      adapter.addEventListener('sync-error', errorListener);
      
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents'
      };
      
      await adapter.connect(config);
      jest.advanceTimersByTime(1000); // 等待连接完成
      
      try {
        await adapter.startSync(mockDB);
      } catch (error) {
        // 忽略错误
      }
      
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toBe('同步失败');
    });
    
    test('应该在未连接时抛出错误', async () => {
      await expect(adapter.startSync(mockDB)).rejects.toThrow('请先连接到RemoteStorage服务器');
    });
  });
  
  describe('进度计算', () => {
    test('应该正确计算同步进度', async () => {
      const progressListener = jest.fn();
      adapter.addEventListener('sync-progress', progressListener);
      
      // 重新模拟mockDB.sync以提供进度信息
      mockDB.sync = jest.fn().mockImplementation(() => {
        const eventEmitter = {
          on: jest.fn().mockReturnThis(),
          cancel: jest.fn(),
        };
        
        // 模拟不同阶段的进度
        setTimeout(() => {
          eventEmitter.on.mock.calls
            .find(call => call[0] === 'change')?.[1]?.({
              docs_read: 100,
              docs_written: 25
            });
          
          eventEmitter.on.mock.calls
            .find(call => call[0] === 'change')?.[1]?.({
              docs_read: 100,
              docs_written: 50
            });
          
          eventEmitter.on.mock.calls
            .find(call => call[0] === 'change')?.[1]?.({
              docs_read: 100,
              docs_written: 75
            });
          
          eventEmitter.on.mock.calls
            .find(call => call[0] === 'complete')?.[1]?.();
        }, 100);
        
        return eventEmitter as any;
      });
      
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents'
      };
      
      await adapter.connect(config);
      jest.advanceTimersByTime(1000); // 等待连接完成
      
      await adapter.startSync(mockDB);
      
      // 快进时间以触发进度更新
      jest.advanceTimersByTime(100);
      
      // 验证进度计算
      const progressCalls = progressListener.mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
      
      // 检查最终进度 - 适配器现在使用PouchDB.sync的进度事件
      expect(adapter.getSyncStatus().progress).toBe(100);
    });
    
    test('应该处理缺少进度信息的情况', async () => {
      // 重新模拟PouchDB实例的sync方法不提供进度信息
      mockDB.sync = jest.fn().mockImplementation(() => {
        const eventEmitter = {
          on: jest.fn().mockReturnThis(),
          cancel: jest.fn(),
        };
        
        setTimeout(() => {
          eventEmitter.on.mock.calls
            .find(call => call[0] === 'change')?.[1]?.({
              docs_read: 100,
              docs_written: 50
            });
          
          eventEmitter.on.mock.calls
            .find(call => call[0] === 'complete')?.[1]?.();
        }, 100);
        
        return eventEmitter as any;
      });
      
      const progressListener = jest.fn();
      adapter.addEventListener('sync-progress', progressListener);
      
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents'
      };
      
      await adapter.connect(config);
      jest.advanceTimersByTime(1000); // 等待连接完成
      
      await adapter.startSync(mockDB);
      
      // 快进时间以触发进度更新
      jest.advanceTimersByTime(100);
      
      // 验证进度监听器被调用
      expect(progressListener).toHaveBeenCalled();
    });
  });
});