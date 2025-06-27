/**
 * Universal Sync Library
 * 一个支持多后端的浏览器端数据同步库
 */

// 导出接口
export type {
  SyncAdapter,
  SyncStatus,
  SyncStatusInfo,
  SyncEventType,
  SyncEventData
} from './interfaces/SyncAdapter';

// 导出适配器
export { BaseSyncAdapter } from './adapters/BaseSyncAdapter';
export { WebDAVAdapter } from './adapters/WebDAVAdapter';
export type { WebDAVConfig } from './adapters/WebDAVAdapter';

// 注册自定义元素
import { SyncController } from './components/SyncController';
customElements.define('sync-controller', SyncController);

/**
 * 库版本号
 */
export const VERSION = '0.1.0';

/**
 * 创建同步控制器
 * @param targetElement 目标DOM元素
 * @param options 配置选项
 * @returns 同步控制器实例
 */
export function createSyncController(
  targetElement: HTMLElement,
  options: {
    pouchDbInstance: PouchDB.Database;
    adapters?: SyncAdapter[];
  }
): SyncController {
  const controller = new SyncController();
  controller.initialize(options);
  targetElement.appendChild(controller);
  return controller;
}

/**
 * 默认导出
 */
export default {
  VERSION,
  createSyncController
};