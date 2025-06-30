import PouchDB from 'pouchdb';
import { SyncAdapter } from '../interfaces/SyncAdapter';
import { BaseSyncAdapter } from './BaseSyncAdapter';
import { discoverRemoteStorage, RemoteStorageInfo } from '../utils/remoteStorageDiscovery';
// import { authorizeRemoteStorage } from '../utils/remoteStorageAuth';

interface RemoteStorageToken {
  accessToken: string;
  tokenType: string;
}

/**
 * RemoteStorage适配器配置
 */
export interface RemoteStorageConfig {
  /**
   * 用户地址，格式为 user@example.com
   */
  userAddress: string;
  
  /**
   * 授权令牌
   */
  token: string;
  
  /**
   * 存储模块名称
   */
  storageModule: string;
  
  /**
   * 自动同步间隔（毫秒）
   * 如果设置为0或未设置，则不进行自动同步
   */
  autoSyncInterval?: number;
}

/**
 * RemoteStorage同步适配器
 * 使用RemoteStorage协议实现数据同步
 */
export class RemoteStorageAdapter extends BaseSyncAdapter implements SyncAdapter {
  /**
   * 适配器名称
   */
  readonly name: string = 'RemoteStorage';
  
  /**
   * 适配器图标URL
   */
  iconUrl: string = 'https://remotestorage.io/img/icon.svg';
  
  /**
   * 本地数据库实例
   */
  private localDB: PouchDB.Database | null = null;
  
  /**
   * 远程数据库实例
   */
  private remoteDB: PouchDB.Database | null = null;
  
  /**
   * 同步配置
   */
  private config: RemoteStorageConfig | null = null;
  
  /**
   * 自动同步定时器ID
   */
  private autoSyncTimer: NodeJS.Timeout | null = null;
  
  /**
   * RemoteStorage服务器信息
   */
  private remoteInfo: RemoteStorageInfo | null = null;
  
  /**
   * 认证令牌
   */
  private token: RemoteStorageToken | null = null;
  
  /**
   * 构造函数
   */
  constructor() {
    super();
  }
  
  /**
   * 连接到RemoteStorage服务器
   * @param config 连接配置
   */
  async connect(config: RemoteStorageConfig): Promise<boolean> {
    try {
      // 更新状态
      this.updateStatus({ status: 'connecting' });
      
      // 保存配置
      this.config = config;
      
      // 1. 发现RemoteStorage端点
      const remoteInfo = await discoverRemoteStorage(config.userAddress);
      
      // 2. 验证令牌有效性
      // 这里简化处理，实际应该验证令牌是否有效
      if (!config.token) {
        throw new Error('无效的访问令牌');
      }
      
      // 3. 保存连接信息
      this.remoteInfo = remoteInfo;
      this.token = {
        accessToken: config.token,
        tokenType: 'Bearer'
      };
      
      // 4. 测试连接
      const testResponse = await fetch(`${remoteInfo.server}${remoteInfo.webdavPath}/`, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Depth': '0'
        }
      });
      
      if (!testResponse.ok) {
        throw new Error(`连接测试失败: ${testResponse.status} ${testResponse.statusText}`);
      }
      
      // 更新状态
      this.updateStatus({ status: 'connected' });
      
      // 触发连接成功事件
      this.dispatchEvent('connected', {});
      
      return true;
    } catch (error) {
      // 更新状态
      this.updateStatus({ 
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : '连接失败',
          details: error
        }
      });
      
      // 触发连接失败事件
      this.dispatchEvent('connection-error', {
        error: {
          message: error instanceof Error ? error.message : '连接失败',
          details: error
        }
      });
      
      return false;
    }
  }
  
  /**
   * 开始同步
   * @param localDB PouchDB实例
   */
  async startSync(localDB: PouchDB.Database): Promise<void> {
    // 检查是否已连接
    if (!this.config || !this.remoteInfo || !this.token) {
      throw new Error('请先连接到RemoteStorage服务器');
    }
    
    // 保存本地数据库实例
    this.localDB = localDB;
    
    // 执行一次同步
    await this.triggerSync();
    
    // 设置自动同步
    if (this.config.autoSyncInterval && this.config.autoSyncInterval > 0) {
      this.autoSyncTimer = setInterval(() => {
        this.triggerSync().catch(error => {
          console.error('自动同步失败:', error);
          this.updateStatus({ 
            status: 'error',
            error: {
              message: error instanceof Error ? error.message : '自动同步失败',
              details: error
            }
          });
        });
      }, this.config.autoSyncInterval);
    }
  }
  
  /**
   * 停止同步
   */
  stopSync(): void {
    // 清除自动同步定时器
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    
    // 更新状态
    this.updateStatus({ status: 'idle' });
    
          // 触发停止事件
          this.dispatchEvent('sync-stopped', {});
  }
  
  /**
   * 触发同步
   */
  private async triggerSync(): Promise<void> {
    if (!this.localDB || !this.remoteInfo || !this.token) {
      throw new Error('未连接到RemoteStorage服务器');
    }
    
    try {
      // 更新状态
      this.updateStatus({ status: 'syncing', progress: 0 });
      
      // 1. 获取远程文档列表
      const remoteDocs = await this.listRemoteDocuments();
      this.updateStatus({ status: 'syncing', progress: 30 });
      
      // 2. 获取本地文档列表
      const localDocs = await this.localDB.allDocs({ include_docs: true });
      this.updateStatus({ status: 'syncing', progress: 60 });
      
      // 3. 同步远程到本地
      for (const remoteDoc of remoteDocs) {
        const localDoc = localDocs.rows.find(row => row.id === remoteDoc._id);
        
        // 冲突解决策略：远程优先
        if (!localDoc || !localDoc.doc || !localDoc.doc._rev || remoteDoc._rev > localDoc.doc._rev) {
          await this.localDB.put(remoteDoc);
        }
      }
      
      // 4. 同步本地到远程
      for (const localRow of localDocs.rows) {
        const remoteDoc = remoteDocs.find(doc => doc._id === localRow.id);
        
        // 冲突解决策略：本地优先
        if (!localRow.doc || !localRow.doc._rev) continue;
        
        if (!remoteDoc || localRow.doc._rev > remoteDoc._rev) {
          await this.putRemoteDocument(localRow.doc);
        }
      }
      
      // 更新状态
      this.updateStatus({ status: 'completed', progress: 100 });
      
      // 触发完成事件
      this.dispatchEvent('sync-complete', {});
    } catch (error) {
      // 更新状态
      this.updateStatus({ 
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : '同步失败',
          details: error
        }
      });
      
      // 触发错误事件
      this.dispatchEvent('sync-error', {
        error: {
          message: error instanceof Error ? error.message : '同步失败', 
          details: error
        }
      });
    }
  }

  /**
   * 获取远程文档列表
   */
  private async listRemoteDocuments(): Promise<any[]> {
    if (!this.remoteInfo || !this.token) {
      throw new Error('未连接到RemoteStorage服务器');
    }
    
    const response = await fetch(`${this.remoteInfo.server}${this.remoteInfo.webdavPath}/`, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Bearer ${this.token.accessToken}`,
        'Depth': '1',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`获取远程文档列表失败: ${response.status} ${response.statusText}`);
    }
    
    // 解析WebDAV响应并转换为文档数组
    // 这里简化处理，实际应该解析WebDAV响应
    const data = await response.json();
    return data.items || [];
  }

  /**
   * 上传文档到远程存储
   */
  private async putRemoteDocument(doc: any): Promise<void> {
    if (!this.remoteInfo || !this.token) {
      throw new Error('未连接到RemoteStorage服务器');
    }
    
    const response = await fetch(`${this.remoteInfo.server}${this.remoteInfo.webdavPath}/${encodeURIComponent(doc._id)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(doc)
    });
    
    if (!response.ok) {
      throw new Error(`保存远程文档失败: ${response.status} ${response.statusText}`);
    }
  }
}