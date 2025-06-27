import { WebDAVAdapter, WebDAVConfig } from '../../src/adapters/WebDAVAdapter';
import PouchDB from 'pouchdb';

// 模拟window.setInterval和window.clearInterval
global.setInterval = jest.fn(() => 123) as any;
global.clearInterval = jest.fn() as any;

describe('WebDAVAdapter', () => {
  let adapter: WebDAVAdapter;
  let mockDB: PouchDB.Database;
  
  beforeEach(() => {
    adapter = new WebDAVAdapter();
    mockDB = new PouchDB('test-db');
    
    // 模拟PouchDB.sync方法
    jest.spyOn(PouchDB.prototype, 'sync').mockImplementation(() => {
      const eventHandlers: Record<string, Function> = {};
      
      const mockSync = {
        on: (event: string, handler: Function) => {
          eventHandlers[event] = handler;
          return mockSync;
        },
        cancel: jest.fn(),
        // 模拟触发事件的方法
        _trigger: (event: string, data?: any) => {
          if (eventHandlers[event]) {
            eventHandlers[event](data);
          }
        }
      };
      
      // 模拟同步进度
      setTimeout(() => {
        mockSync._trigger('change', { docs_read: 100, docs_written: 50 });
        mockSync._trigger('paused');
        mockSync._trigger('active');
        mockSync._trigger('complete');
      }, 10);
      
      return mockSync as any;
    });
  });
  
  afterEach(() => {
    adapter.stopSync();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  
  describe('基本属性', () => {
    test('应该有正确的名称和图标', () => {
      expect(adapter.name).toBe('WebDAV');
      expect(adapter.iconUrl).toContain('data:image/svg+xml;base64');
    });
  });
  
  describe('事件处理', () => {
    test('应该添加和触发事件监听器', () => {
      const listener = jest.fn();
      adapter.addEventListener('sync-progress', listener);
      
      // 使用私有方法触发事件（通过连接和同步操作间接触发）
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav'
      };
      
      return adapter.connect(config).then(async () => {
        await adapter.startSync(mockDB);
        
        // 等待异步事件触发
        await new Promise(resolve => setTimeout(resolve, 20));
        
        expect(listener).toHaveBeenCalled();
        expect(listener.mock.calls[0][0].type).toBe('sync-progress');
      });
    });
    
    test('应该移除事件监听器', () => {
      const listener = jest.fn();
      adapter.addEventListener('sync-progress', listener);
      adapter.removeEventListener('sync-progress', listener);
      
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav'
      };
      
      return adapter.connect(config).then(async () => {
        await adapter.startSync(mockDB);
        
        // 等待异步事件触发
        await new Promise(resolve => setTimeout(resolve, 20));
        
        expect(listener).not.toHaveBeenCalled();
      });
    });
  });
  
  describe('连接功能', () => {
    test('应该成功连接到WebDAV服务器', async () => {
      const connectSuccessListener = jest.fn();
      adapter.addEventListener('connect-success', connectSuccessListener);
      
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav',
        username: 'user',
        password: 'pass'
      };
      
      const result = await adapter.connect(config);
      
      expect(result).toBe(true);
      expect(adapter.getSyncStatus().status).toBe('connected');
      expect(connectSuccessListener).toHaveBeenCalled();
    });
    
    test('应该处理连接错误 - 无效URL', async () => {
      const errorListener = jest.fn();
      adapter.addEventListener('connect-error', errorListener);
      
      const config: WebDAVConfig = {
        url: 'invalid-url'
      };
      
      const result = await adapter.connect(config);
      
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toContain('WebDAV URL必须以http://或https://开头');
    });
    
    test('应该处理连接错误 - 服务器错误', async () => {
      const errorListener = jest.fn();
      adapter.addEventListener('connect-error', errorListener);
      
      const config: WebDAVConfig = {
        url: 'https://example.com/error'
      };
      
      const result = await adapter.connect(config);
      
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toContain('连接失败');
    });
  });
  
  describe('同步功能', () => {
    beforeEach(async () => {
      // 先连接
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav',
        username: 'user',
        password: 'pass'
      };
      
      await adapter.connect(config);
    });
    
    test('应该开始同步并更新进度', async () => {
      const progressListener = jest.fn();
      const completeListener = jest.fn();
      
      adapter.addEventListener('sync-progress', progressListener);
      adapter.addEventListener('sync-complete', completeListener);
      
      await adapter.startSync(mockDB);
      
      // 等待异步事件触发
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(progressListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalled();
      
      // 检查进度计算
      const progressEvent = progressListener.mock.calls[0][0];
      expect(progressEvent.progress).toBe(50); // 50/100 = 50%
      
      // 完成后状态应该是completed
      expect(adapter.getSyncStatus().status).toBe('completed');
      expect(adapter.getSyncStatus().progress).toBe(100);
    });
    
    test('应该设置自动同步', async () => {
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav',
        username: 'user',
        password: 'pass',
        autoSync: true,
        syncInterval: 5000
      };
      
      await adapter.connect(config);
      await adapter.startSync(mockDB);
      
      // 应该调用setInterval
      expect(global.setInterval).toHaveBeenCalled();
      expect((global.setInterval as jest.Mock).mock.calls[0][1]).toBe(5000);
    });
    
    test('应该停止同步', async () => {
      const stoppedListener = jest.fn();
      adapter.addEventListener('sync-stopped', stoppedListener);
      
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav',
        username: 'user',
        password: 'pass',
        autoSync: true,
        syncInterval: 5000
      };
      
      await adapter.connect(config);
      await adapter.startSync(mockDB);
      
      adapter.stopSync();
      
      expect(stoppedListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('idle');
      expect(global.clearInterval).toHaveBeenCalled();
    });
  });
  
  describe('错误处理', () => {
    test('应该处理同步错误', async () => {
      // 重新模拟PouchDB.sync抛出错误
      jest.spyOn(PouchDB.prototype, 'sync').mockImplementation(() => {
        const eventHandlers: Record<string, Function> = {};
        
        const mockSync = {
          on: (event: string, handler: Function) => {
            eventHandlers[event] = handler;
            return mockSync;
          },
          cancel: jest.fn(),
          // 模拟触发错误事件
          _trigger: (event: string, data?: any) => {
            if (eventHandlers[event]) {
              eventHandlers[event](data);
            }
          }
        };
        
        // 模拟同步错误
        setTimeout(() => {
          mockSync._trigger('error', new Error('同步失败'));
        }, 10);
        
        return mockSync as any;
      });
      
      const errorListener = jest.fn();
      adapter.addEventListener('sync-error', errorListener);
      
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav'
      };
      
      await adapter.connect(config);
      await adapter.startSync(mockDB);
      
      // 等待异步事件触发
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toBe('同步错误');
    });
    
    test('应该在未配置时抛出错误', async () => {
      // 不调用connect
      await expect(adapter.startSync(mockDB)).rejects.toThrow('未配置WebDAV连接');
    });
  });
  
  describe('同步事件', () => {
    test('应该处理暂停和活动事件', async () => {
      const pausedListener = jest.fn();
      const activeListener = jest.fn();
      
      adapter.addEventListener('sync-paused', pausedListener);
      adapter.addEventListener('sync-active', activeListener);
      
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav'
      };
      
      await adapter.connect(config);
      await adapter.startSync(mockDB);
      
      // 等待异步事件触发
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(pausedListener).toHaveBeenCalled();
      expect(activeListener).toHaveBeenCalled();
    });
    
    test('应该处理拒绝事件', async () => {
      // 重新模拟PouchDB.sync触发拒绝事件
      jest.spyOn(PouchDB.prototype, 'sync').mockImplementation(() => {
        const eventHandlers: Record<string, Function> = {};
        
        const mockSync = {
          on: (event: string, handler: Function) => {
            eventHandlers[event] = handler;
            return mockSync;
          },
          cancel: jest.fn(),
          _trigger: (event: string, data?: any) => {
            if (eventHandlers[event]) {
              eventHandlers[event](data);
            }
          }
        };
        
        // 模拟同步拒绝
        setTimeout(() => {
          mockSync._trigger('denied', new Error('同步被拒绝'));
        }, 10);
        
        return mockSync as any;
      });
      
      const deniedListener = jest.fn();
      adapter.addEventListener('sync-denied', deniedListener);
      
      const config: WebDAVConfig = {
        url: 'https://example.com/webdav'
      };
      
      await adapter.connect(config);
      await adapter.startSync(mockDB);
      
      // 等待异步事件触发
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(deniedListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toBe('同步被拒绝');
    });
  });
});