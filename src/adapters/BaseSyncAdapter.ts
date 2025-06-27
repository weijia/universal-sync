/**
 * 基础同步适配器
 * 提供同步适配器的基本功能和事件处理
 */
import { SyncAdapter, SyncEventData, SyncStatus } from '../interfaces/SyncAdapter';

/**
 * 基础同步适配器抽象类
 * 实现了事件处理和状态管理的基本功能
 */
export abstract class BaseSyncAdapter implements SyncAdapter {
  /**
   * 适配器名称
   */
  abstract readonly name: string;
  
  /**
   * 适配器图标URL
   */
  iconUrl?: string;
  
  /**
   * 当前同步状态
   */
  protected status: SyncStatus = {
    status: 'idle'
  };
  
  /**
   * 事件监听器映射
   */
  private eventListeners: Map<string, Set<(data: SyncEventData) => void>> = new Map();
  
  /**
   * 获取当前同步状态
   * @returns 同步状态对象
   */
  getSyncStatus(): SyncStatus {
    return { ...this.status };
  }
  
  /**
   * 添加事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  addEventListener(event: string, listener: (data: SyncEventData) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)?.add(listener);
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
      
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }
  
  /**
   * 分发事件
   * @param event 事件名称
   * @param data 事件数据
   */
  protected dispatchEvent(event: string, data: Omit<SyncEventData, 'type'>): void {
    const eventData: SyncEventData = {
      type: event,
      ...data
    };
    
    const listeners = this.eventListeners.get(event);
    
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(eventData);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * 更新同步状态
   * @param status 新的同步状态
   */
  protected updateStatus(status: Partial<SyncStatus>): void {
    this.status = {
      ...this.status,
      ...status
    };
    
    // 根据状态分发相应的事件
    if (status.status === 'syncing') {
      this.dispatchEvent('sync-progress', {
        status: this.status
      });
    } else if (status.status === 'error') {
      this.dispatchEvent('sync-error', {
        status: this.status,
        error: status.error
      });
    }
  }
  
  /**
   * 连接到同步后端
   * @param config 连接配置
   */
  abstract connect(config: Record<string, any>): Promise<boolean>;
  
  /**
   * 开始同步
   * @param localDB PouchDB实例
   */
  abstract startSync(localDB: PouchDB.Database): Promise<void>;
  
  /**
   * 停止同步
   */
  abstract stopSync(): void;
}