/**
 * WebDAV同步适配器
 * 使用WebDAV协议同步PouchDB数据
 */
import { SyncAdapter, SyncEventData, SyncStatus } from '../interfaces/SyncAdapter';

/**
 * WebDAV适配器配置
 */
export interface WebDAVConfig {
  /**
   * WebDAV服务器URL
   */
  url: string;
  
  /**
   * 用户名
   */
  username?: string;
  
  /**
   * 密码
   */
  password?: string;
  
  /**
   * 数据库路径
   */
  dbPath?: string;
  
  /**
   * 是否启用自动同步
   */
  autoSync?: boolean;
  
  /**
   * 自动同步间隔（毫秒）
   */
  syncInterval?: number;
}

/**
 * WebDAV同步适配器
 */
export class WebDAVAdapter implements SyncAdapter {
  /**
   * 适配器名称
   */
  readonly name = 'WebDAV';
  
  /**
   * 适配器图标URL
   */
  readonly iconUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTAgMTNhNSA1IDAgMCAwIDcuNTQgLjU0bDMtM2E1IDUgMCAwIDAgLTcuMDctNy4wN2wtMS43MiAxLjcxIj48L3BhdGg+PHBhdGggZD0iTTE0IDExYTUgNSAwIDAgMCAtNy41NCAtLjU0bC0zIDNhNSA1IDAgMCAwIDcuMDcgNy4wN2wxLjcxIC0xLjcxIj48L3BhdGg+PC9zdmc+';
  
  /**
   * 当前同步状态
   */
  private syncStatus: SyncStatus = { status: 'idle' };
  
  /**
   * 事件监听器
   */
  private eventListeners: Map<string, Set<(data: SyncEventData) => void>> = new Map();
  
  /**
   * WebDAV客户端
   */
  private client: any = null;
  
  /**
   * 同步配置
   */
  private config: WebDAVConfig | null = null;
  
  /**
   * 本地数据库
   */
  private localDB: PouchDB.Database | null = null;
  
  /**
   * 远程数据库
   */
  private remoteDB: PouchDB.Database | null = null;
  
  /**
   * 同步对象
   */
  private syncHandler: PouchDB.Replication.Sync<{}> | null = null;
  
  /**
   * 自动同步定时器
   */
  private autoSyncTimer: number | null = null;
  
  /**
   * 构造函数
   */
  constructor() {
    // 初始化事件监听器映射
    this.eventListeners.set('connect-success', new Set());
    this.eventListeners.set('connect-error', new Set());
    this.eventListeners.set('sync-progress', new Set());
    this.eventListeners.set('sync-error', new Set());
    this.eventListeners.set('sync-complete', new Set());
    this.eventListeners.set('sync-paused', new Set());
    this.eventListeners.set('sync-active', new Set());
    this.eventListeners.set('sync-denied', new Set());
    this.eventListeners.set('sync-stopped', new Set());
  }
  
  /**
   * 获取当前同步状态
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }
  
  /**
   * 添加事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  addEventListener(event: string, listener: (data: SyncEventData) => void): void {
    const listeners = this.eventListeners.get(event);
    
    if (listeners) {
      listeners.add(listener);
    } else {
      this.eventListeners.set(event, new Set([listener]));
    }
  }
  
  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  removeEventListener(event: string, listener: (data: SyncEventData) => void): void {
    const listeners = this.eventListeners.get(event);
    
    if (listeners) {
      listeners.delete(listener);
    }
  }
  
  /**
   * 触发事件
   * @param event 事件名称
   * @param data 事件数据
   */
  private triggerEvent(event: string, data: Partial<SyncEventData> = {}): void {
    const listeners = this.eventListeners.get(event);
    
    if (listeners) {
      const eventData: SyncEventData = {
        type: event,
        status: this.syncStatus,
        ...data
      };
      
      listeners.forEach(listener => {
        try {
          listener(eventData);
        } catch (error) {
          console.error('事件监听器错误:', error);
        }
      });
    }
  }
  
  /**
   * 更新同步状态
   * @param status 新状态
   */
  private updateStatus(status: Partial<SyncStatus>): void {
    this.syncStatus = {
      ...this.syncStatus,
      ...status
    };
  }
  
  /**
   * 连接到WebDAV服务器
   * @param config 连接配置
   */
  async connect(config: WebDAVConfig): Promise<boolean> {
    try {
      // 更新状态
      this.updateStatus({ status: 'connecting' });
      
      // 保存配置
      this.config = config;
      
      // 创建WebDAV客户端
      // 注意：这里需要实际的WebDAV客户端库，如webdav-client
      // 这里只是一个示例实现
      this.client = {
        url: config.url,
        username: config.username,
        password: config.password
      };
      
      // 检查连接
      await this.checkConnection();
      
      // 更新状态
      this.updateStatus({ status: 'connected' });
      
      // 触发连接成功事件
      this.triggerEvent('connect-success');
      
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
      
      // 触发连接错误事件
      this.triggerEvent('connect-error', {
        error: {
          message: error instanceof Error ? error.message : '连接失败',
          details: error
        }
      });
      
      return false;
    }
  }
  
  /**
   * 检查WebDAV连接
   */
  private async checkConnection(): Promise<void> {
    // 这里应该实现实际的WebDAV连接检查
    // 例如，尝试读取目录或创建测试文件
    
    // 模拟连接检查
    if (!this.config?.url) {
      throw new Error('WebDAV URL不能为空');
    }
    
    // 如果URL不是以http://或https://开头，则抛出错误
    if (!/^https?:\/\//i.test(this.config.url)) {
      throw new Error('WebDAV URL必须以http://或https://开头');
    }
    
    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 如果URL包含"error"，则模拟连接错误
    if (this.config.url.includes('error')) {
      throw new Error('连接失败：无法连接到WebDAV服务器');
    }
  }
  
  /**
   * 开始同步
   * @param localDB 本地数据库
   */
  async startSync(localDB: PouchDB.Database): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('未配置WebDAV连接');
      }
      
      // 保存本地数据库引用
      this.localDB = localDB;
      
      // 更新状态
      this.updateStatus({ status: 'syncing', progress: 0 });
      
      // 创建远程数据库
      // 注意：这里需要实际的PouchDB适配器来连接WebDAV
      // 这里只是一个示例实现
      const dbPath = this.config.dbPath || '/sync/db';
      const remoteUrl = `${this.config.url.replace(/\/$/, '')}${dbPath}`;
      
      // 在实际实现中，这里应该使用PouchDB的WebDAV适配器
      // 例如：new PouchDB(remoteUrl, { adapter: 'webdav', auth: { username, password } })
      this.remoteDB = new PouchDB(remoteUrl);
      
      // 开始同步
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: true,
        retry: true
      })
      .on('change', info => {
        // 计算进度
        const progress = this.calculateProgress(info);
        
        // 更新状态
        this.updateStatus({ status: 'syncing', progress });
        
        // 触发进度事件
        this.triggerEvent('sync-progress', { progress });
      })
      .on('paused', () => {
        // 更新状态
        this.updateStatus({ status: 'paused' });
        
        // 触发暂停事件
        this.triggerEvent('sync-paused');
      })
      .on('active', () => {
        // 更新状态
        this.updateStatus({ status: 'syncing' });
        
        // 触发活动事件
        this.triggerEvent('sync-active');
      })
      .on('denied', error => {
        // 更新状态
        this.updateStatus({ 
          status: 'error',
          error: {
            message: '同步被拒绝',
            details: error
          }
        });
        
        // 触发拒绝事件
        this.triggerEvent('sync-denied', {
          error: {
            message: '同步被拒绝',
            details: error
          }
        });
      })
      .on('complete', info => {
        // 更新状态
        this.updateStatus({ status: 'completed', progress: 100 });
        
        // 触发完成事件
        this.triggerEvent('sync-complete');
      })
      .on('error', error => {
        // 更新状态
        this.updateStatus({ 
          status: 'error',
          error: {
            message: '同步错误',
            details: error
          }
        });
        
        // 触发错误事件
        this.triggerEvent('sync-error', {
          error: {
            message: '同步错误',
            details: error
          }
        });
      });
      
      // 设置自动同步
      if (this.config.autoSync && this.config.syncInterval) {
        this.setupAutoSync();
      }
      
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
      this.triggerEvent('sync-error', {
        error: {
          message: error instanceof Error ? error.message : '同步失败',
          details: error
        }
      });
      
      throw error;
    }
  }
  
  /**
   * 停止同步
   */
  stopSync(): void {
    // 取消自动同步
    if (this.autoSyncTimer !== null) {
      window.clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    
    // 取消同步
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
    }
    
    // 关闭远程数据库
    if (this.remoteDB) {
      this.remoteDB.close();
      this.remoteDB = null;
    }
    
    // 更新状态
    this.updateStatus({ status: 'idle', progress: 0 });
    
    // 触发停止事件
    this.triggerEvent('sync-stopped');
  }
  
  /**
   * 设置自动同步
   */
  private setupAutoSync(): void {
    if (!this.config?.autoSync || !this.config?.syncInterval) return;
    
    // 清除现有定时器
    if (this.autoSyncTimer !== null) {
      window.clearInterval(this.autoSyncTimer);
    }
    
    // 设置新定时器
    this.autoSyncTimer = window.setInterval(() => {
      // 如果当前不在同步中，则触发同步
      if (this.syncStatus.status !== 'syncing') {
        this.triggerSync();
      }
    }, this.config.syncInterval);
  }
  
  /**
   * 触发同步
   */
  private async triggerSync(): Promise<void> {
    if (!this.localDB || !this.remoteDB) return;
    
    try {
      // 更新状态
      this.updateStatus({ status: 'syncing', progress: 0 });
      
      // 执行一次性同步
      const result = await this.localDB.sync(this.remoteDB);
      
      // 更新状态
      this.updateStatus({ status: 'completed', progress: 100 });
      
      // 触发完成事件
      this.triggerEvent('sync-complete');
      
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
      this.triggerEvent('sync-error', {
        error: {
          message: error instanceof Error ? error.message : '同步失败',
          details: error
        }
      });
    }
  }
  
  /**
   * 计算同步进度
   * @param info 同步信息
   */
  private calculateProgress(info: any): number {
    // 这里应该根据同步信息计算实际进度
    // 例如，可以根据已同步的文档数与总文档数的比例来计算
    
    // 如果有文档写入和读取信息
    if (info && typeof info.docs_written === 'number' && typeof info.docs_read === 'number') {
      const total = info.docs_read + info.docs_written;
      const current = info.docs_written;
      
      // 确保进度不超过99%，留1%给最终完成状态
      return Math.min(Math.round((current / total) * 100), 99);
    }
    
    // 如果没有具体的进度信息，返回一个模拟的进度
    return 50;
  }
}