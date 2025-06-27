/**
 * 同步适配器接口
 * 定义了同步适配器必须实现的方法和属性
 */

/**
 * 同步状态
 */
export interface SyncStatus {
  /**
   * 当前状态
   */
  status: 'idle' | 'connecting' | 'connected' | 'syncing' | 'paused' | 'completed' | 'error';
  
  /**
   * 同步进度（0-100）
   */
  progress?: number;
  
  /**
   * 错误信息
   */
  error?: {
    /**
     * 错误消息
     */
    message: string;
    
    /**
     * 详细错误信息
     */
    details?: unknown;
  };
}

/**
 * 同步事件数据
 */
export interface SyncEventData {
  /**
   * 事件类型
   */
  type: string;
  
  /**
   * 当前同步状态
   */
  status: SyncStatus;
  
  /**
   * 错误信息（如果有）
   */
  error?: {
    /**
     * 错误消息
     */
    message: string;
    
    /**
     * 详细错误信息
     */
    details?: unknown;
  };
  
  /**
   * 其他事件数据
   */
  [key: string]: unknown;
}

/**
 * 同步适配器接口
 */
export interface SyncAdapter {
  /**
   * 适配器名称
   */
  readonly name: string;
  
  /**
   * 适配器图标URL
   */
  iconUrl?: string;
  
  /**
   * 获取当前同步状态
   * @returns 同步状态对象
   */
  getSyncStatus(): SyncStatus;
  
  /**
   * 添加事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  addEventListener(event: string, listener: (data: SyncEventData) => void): void;
  
  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  removeEventListener(event: string, listener: (data: SyncEventData) => void): void;
  
  /**
   * 连接到同步后端
   * @param config 连接配置
   * @returns 连接是否成功
   */
  connect(config: Record<string, any>): Promise<boolean>;
  
  /**
   * 开始同步
   * @param localDB PouchDB实例
   */
  startSync(localDB: PouchDB.Database): Promise<void>;
  
  /**
   * 停止同步
   */
  stopSync(): void;
}