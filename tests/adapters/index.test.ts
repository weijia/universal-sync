import {
  BaseSyncAdapter,
  WebDAVAdapter,
  RemoteStorageAdapter,
  DropboxAdapter,
  GoogleDriveAdapter,
  SyncAdapter,
  SyncStatus,
  WebDAVConfig,
  RemoteStorageConfig,
  DropboxConfig,
  GoogleDriveConfig
} from '../../src/adapters';

describe('适配器导出', () => {
  test('应该导出所有适配器类', () => {
    expect(BaseSyncAdapter).toBeDefined();
    expect(WebDAVAdapter).toBeDefined();
    expect(RemoteStorageAdapter).toBeDefined();
    expect(DropboxAdapter).toBeDefined();
    expect(GoogleDriveAdapter).toBeDefined();
  });
  
  test('应该导出所有适配器配置类型', () => {
    // 创建配置对象来验证类型
    const webdavConfig: WebDAVConfig = {
      url: 'https://example.com/webdav',
      username: 'user',
      password: 'pass'
    };
    
    const remoteStorageConfig: RemoteStorageConfig = {
      userAddress: 'user@example.com',
      token: 'test-token',
      storageModule: 'documents'
    };
    
    const dropboxConfig: DropboxConfig = {
      accessToken: 'test-token',
      remotePath: '/sync-db'
    };
    
    const googleDriveConfig: GoogleDriveConfig = {
      accessToken: 'test-token',
      fileId: 'test-file-id'
    };
    
    // 验证配置对象
    expect(webdavConfig).toBeDefined();
    expect(remoteStorageConfig).toBeDefined();
    expect(dropboxConfig).toBeDefined();
    expect(googleDriveConfig).toBeDefined();
  });
  
  test('应该能够创建适配器实例', () => {
    const webdavAdapter = new WebDAVAdapter();
    const remoteStorageAdapter = new RemoteStorageAdapter();
    const dropboxAdapter = new DropboxAdapter();
    const googleDriveAdapter = new GoogleDriveAdapter();
    
    expect(webdavAdapter).toBeInstanceOf(WebDAVAdapter);
    expect(remoteStorageAdapter).toBeInstanceOf(RemoteStorageAdapter);
    expect(dropboxAdapter).toBeInstanceOf(DropboxAdapter);
    expect(googleDriveAdapter).toBeInstanceOf(GoogleDriveAdapter);
    
    // 验证所有适配器都实现了SyncAdapter接口
    const adapters: SyncAdapter[] = [
      webdavAdapter,
      remoteStorageAdapter,
      dropboxAdapter,
      googleDriveAdapter
    ];
    
    adapters.forEach(adapter => {
      expect(adapter.name).toBeDefined();
      expect(adapter.iconUrl).toBeDefined();
      expect(typeof adapter.connect).toBe('function');
      expect(typeof adapter.startSync).toBe('function');
      expect(typeof adapter.stopSync).toBe('function');
      expect(typeof adapter.getSyncStatus).toBe('function');
      expect(typeof adapter.addEventListener).toBe('function');
      expect(typeof adapter.removeEventListener).toBe('function');
    });
  });
  
  test('应该返回正确的同步状态', () => {
    const adapter = new WebDAVAdapter();
    const status: SyncStatus = adapter.getSyncStatus();
    
    expect(status).toBeDefined();
    expect(status.status).toBe('idle');
    expect(status.progress).toBe(0);
    expect(status.error).toBeUndefined();
  });
  
  test('应该能够添加和移除事件监听器', () => {
    const adapter = new DropboxAdapter();
    const listener = jest.fn();
    
    adapter.addEventListener('sync-progress', listener);
    adapter.removeEventListener('sync-progress', listener);
    
    // 验证不会抛出错误
    expect(() => {
      adapter.addEventListener('sync-complete', listener);
      adapter.removeEventListener('sync-complete', listener);
    }).not.toThrow();
  });
  
  test('应该能够处理事件', () => {
    const adapter = new BaseSyncAdapter();
    const listener = jest.fn();
    
    adapter.addEventListener('sync-progress', listener);
    
    // 使用私有方法触发事件
    // @ts-ignore - 访问私有方法
    adapter.dispatchEvent(new CustomEvent('sync-progress', { detail: { progress: 50 } }));
    
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].detail.progress).toBe(50);
  });
});