import { GoogleDriveAdapter, GoogleDriveConfig } from '../../src/adapters/GoogleDriveAdapter';
import PouchDB from 'pouchdb';

// 模拟setTimeout和clearInterval
jest.useFakeTimers();

describe('GoogleDriveAdapter', () => {
  let adapter: GoogleDriveAdapter;
  let mockDB: PouchDB.Database;
  
  beforeEach(() => {
    adapter = new GoogleDriveAdapter();
    mockDB = new PouchDB('test-db');
  });
  
  afterEach(() => {
    adapter.stopSync();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  
  describe('基本属性', () => {
    test('应该有正确的名称和图标', () => {
      expect(adapter.name).toBe('Google Drive');
      expect(adapter.iconUrl).toBe('https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png');
    });
  });
  
  describe('连接功能', () => {
    test('应该成功连接到Google Drive', async () => {
      const connectSuccessListener = jest.fn();
      adapter.addEventListener('connected', connectSuccessListener);
      
      const config: GoogleDriveConfig = {
        accessToken: 'test-token',
        fileId: 'test-file-id'
      };
      
      const result = await adapter.connect(config);
      
      expect(result).toBe(true);
      expect(adapter.getSyncStatus().status).toBe('connected');
      expect(connectSuccessListener).toHaveBeenCalled();
    });
    
    test('应该处理连接错误', async () => {
      // 模拟Promise.reject
      jest.spyOn(global, 'Promise').mockImplementationOnce(() => ({
        then: jest.fn().mockReturnThis(),
        catch: jest.fn().mockReturnThis(),
        finally: jest.fn(),
        // 强制触发错误
        then: jest.fn().mockImplementation(() => {
          throw new Error('连接失败');
        })
      } as any));
      
      const errorListener = jest.fn();
      adapter.addEventListener('connection-error', errorListener);
      
      const config: GoogleDriveConfig = {
        accessToken: 'invalid-token',
        fileId: 'test-file-id'
      };
      
      const result = await adapter.connect(config);
      
      expect(result).toBe(false);
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toBe('连接失败');
    });
  });
  
  describe('同步功能', () => {
    beforeEach(async () => {
      // 先连接
      const config: GoogleDriveConfig = {
        accessToken: 'test-token',
        fileId: 'test-file-id'
      };
      
      await adapter.connect(config);
    });
    
    test('应该开始同步并更新进度', async () => {
      const progressListener = jest.fn();
      const completeListener = jest.fn();
      
      adapter.addEventListener('sync-progress', progressListener);
      adapter.addEventListener('sync-complete', completeListener);
      
      await adapter.startSync(mockDB);
      
      // 快进所有定时器
      jest.runAllTimers();
      
      expect(progressListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('completed');
      expect(adapter.getSyncStatus().progress).toBe(100);
    });
    
    test('应该设置自动同步', async () => {
      const config: GoogleDriveConfig = {
        accessToken: 'test-token',
        fileId: 'test-file-id',
        autoSyncInterval: 5000
      };
      
      await adapter.connect(config);
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
      
      const config: GoogleDriveConfig = {
        accessToken: 'test-token',
        fileId: 'test-file-id',
        autoSyncInterval: 5000
      };
      
      await adapter.connect(config);
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
      // 模拟PouchDB.sync抛出错误
      jest.spyOn(PouchDB.prototype, 'sync').mockImplementation(() => {
        throw new Error('同步失败');
      });
      
      const errorListener = jest.fn();
      adapter.addEventListener('sync-error', errorListener);
      
      const config: GoogleDriveConfig = {
        accessToken: 'test-token',
        fileId: 'test-file-id'
      };
      
      await adapter.connect(config);
      
      try {
        await adapter.startSync(mockDB);
        // 快进所有定时器
        jest.runAllTimers();
      } catch (error) {
        // 忽略错误
      }
      
      expect(errorListener).toHaveBeenCalled();
      expect(adapter.getSyncStatus().status).toBe('error');
      expect(adapter.getSyncStatus().error).toBeDefined();
      expect(adapter.getSyncStatus().error?.message).toBe('同步失败');
    });
    
    test('应该在未连接时抛出错误', async () => {
      await expect(adapter.startSync(mockDB)).rejects.toThrow('请先连接到Google Drive');
    });
  });
});