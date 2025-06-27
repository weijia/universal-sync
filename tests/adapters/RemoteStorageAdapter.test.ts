import { RemoteStorageAdapter, RemoteStorageConfig } from '../../src/adapters/RemoteStorageAdapter';
import PouchDB from 'pouchdb';

// 模拟定时器
jest.useFakeTimers();

describe('RemoteStorageAdapter', () => {
  let adapter: RemoteStorageAdapter;
  let mockDB: PouchDB.Database;
  
  beforeEach(() => {
    adapter = new RemoteStorageAdapter();
    mockDB = new PouchDB('test-db');
    
    // 模拟PouchDB.sync方法
    jest.spyOn(PouchDB.prototype, 'sync').mockImplementation(() => {
      const eventEmitter = {
        on: jest.fn().mockReturnThis(),
        cancel: jest.fn(),
      };
      
      // 模拟同步成功
      setTimeout(() => {
        const changeInfo = {
          docs_read: 100,
          docs_written: 50
        };
        eventEmitter.on.mock.calls
          .find(call => call[0] === 'change')?.[1]?.(changeInfo);
        
        eventEmitter.on.mock.calls
          .find(call => call[0] === 'complete')?.[1]?.();
      }, 100);
      
      return eventEmitter as any;
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
      const connectSuccessListener = jest.fn();
      adapter.addEventListener('connected', connectSuccessListener);
      
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'test-token',
        storageModule: 'documents'
      };
      
      const result = await adapter.connect(config);
      
      // 等待连接验证过程
      jest.advanceTimersByTime(1000);
      
      expect(result).toBe(true);
      expect(adapter.getSyncStatus().status).toBe('connected');
      expect(connectSuccessListener).toHaveBeenCalled();
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
      // 模拟Promise.reject
      jest.spyOn(global, 'Promise').mockImplementationOnce(() => ({
        then: jest.fn().mockReturnThis(),
        catch: jest.fn().mockReturnThis(),
        finally: jest.fn(),
        // 强制触发错误
        then: jest.fn().mockImplementation(() => {
          throw new Error('服务器错误');
        })
      } as any));
      
      const errorListener = jest.fn();
      adapter.addEventListener('connection-error', errorListener);
      
      const config: RemoteStorageConfig = {
        userAddress: 'user@example.com',
        token: 'invalid-token',
        storageModule: 'documents'
      };
      
      const result = await adapter.connect(config);
      
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toBe('服务器错误');
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
      
      // 应该触发了一次额外的同步
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
      // 重新模拟PouchDB.sync抛出错误
      jest.spyOn(PouchDB.prototype, 'sync').mockImplementation(() => {
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
      
      // 重新模拟PouchDB.sync以提供进度信息
      jest.spyOn(PouchDB.prototype, 'sync').mockImplementation(() => {
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
      
      // 检查最终进度
      expect(adapter.getSyncStatus().progress).toBe(100);
    });
    
    test('应该处理缺少进度信息的情况', async () => {
      // 重新模拟PouchDB.sync不提供进度信息
      jest.spyOn(PouchDB.prototype, 'sync').mockImplementation(() => {
        const eventEmitter = {
          on: jest.fn().mockReturnThis(),
          cancel: jest.fn(),
        };
        
        setTimeout(() => {
          eventEmitter.on.mock.calls
            .find(call => call[0] === 'change')?.[1]?.({});
          
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
      
      // 验证使用了默认进度
      const progressCalls = progressListener.mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(adapter.getSyncStatus().progress).toBe(100);
    });
  });
});