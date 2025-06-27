import { SyncAdapter } from '../interfaces/SyncAdapter';
import { WebDAVAdapter } from './WebDAVAdapter';
import { RemoteStorageAdapter } from './RemoteStorageAdapter';
import { DropboxAdapter } from './DropboxAdapter';
import { GoogleDriveAdapter } from './GoogleDriveAdapter';

/**
 * 同步适配器类型枚举
 */
export enum SyncAdapterType {
  WEBDAV = 'webdav',
  REMOTE_STORAGE = 'remotestorage',
  DROPBOX = 'dropbox',
  GOOGLE_DRIVE = 'googledrive'
}

/**
 * 同步适配器工厂类
 * 负责创建和管理同步适配器实例
 */
export class SyncAdapterFactory {
  private static instance: SyncAdapterFactory;
  private adapterConstructors: Map<SyncAdapterType, new () => SyncAdapter>;
  
  private constructor() {
    this.adapterConstructors = new Map();
    this.registerDefaultAdapters();
  }
  
  /**
   * 获取工厂实例（单例模式）
   */
  public static getInstance(): SyncAdapterFactory {
    if (!SyncAdapterFactory.instance) {
      SyncAdapterFactory.instance = new SyncAdapterFactory();
    }
    return SyncAdapterFactory.instance;
  }
  
  /**
   * 注册默认的适配器
   */
  private registerDefaultAdapters(): void {
    this.registerAdapter(SyncAdapterType.WEBDAV, WebDAVAdapter);
    this.registerAdapter(SyncAdapterType.REMOTE_STORAGE, RemoteStorageAdapter);
    this.registerAdapter(SyncAdapterType.DROPBOX, DropboxAdapter);
    this.registerAdapter(SyncAdapterType.GOOGLE_DRIVE, GoogleDriveAdapter);
  }
  
  /**
   * 注册新的适配器类型
   * @param type 适配器类型
   * @param constructor 适配器构造函数
   */
  public registerAdapter(type: SyncAdapterType, constructor: new () => SyncAdapter): void {
    this.adapterConstructors.set(type, constructor);
  }
  
  /**
   * 创建指定类型的适配器实例
   * @param type 适配器类型
   * @returns 适配器实例
   * @throws Error 如果适配器类型未注册
   */
  public createAdapter(type: SyncAdapterType): SyncAdapter {
    const Constructor = this.adapterConstructors.get(type);
    if (!Constructor) {
      throw new Error(`未注册的适配器类型: ${type}`);
    }
    return new Constructor();
  }
  
  /**
   * 获取所有已注册的适配器类型
   * @returns 适配器类型数组
   */
  public getRegisteredAdapterTypes(): SyncAdapterType[] {
    return Array.from(this.adapterConstructors.keys());
  }
  
  /**
   * 获取指定类型适配器的构造函数
   * @param type 适配器类型
   * @returns 适配器构造函数
   */
  public getAdapterConstructor(type: SyncAdapterType): (new () => SyncAdapter) | undefined {
    return this.adapterConstructors.get(type);
  }
  
  /**
   * 检查适配器类型是否已注册
   * @param type 适配器类型
   * @returns 是否已注册
   */
  public hasAdapter(type: SyncAdapterType): boolean {
    return this.adapterConstructors.has(type);
  }
  
  /**
   * 移除已注册的适配器类型
   * @param type 适配器类型
   * @returns 是否成功移除
   */
  public unregisterAdapter(type: SyncAdapterType): boolean {
    return this.adapterConstructors.delete(type);
  }
  
  /**
   * 重置工厂状态，移除所有注册的适配器
   * 主要用于测试目的
   */
  public reset(): void {
    this.adapterConstructors.clear();
    this.registerDefaultAdapters();
  }
}