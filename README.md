# Universal Sync

一个支持多后端的浏览器端数据同步库，基于PouchDB构建。

## 特性

- 支持多种同步后端（WebDAV、RemoteStorage、Dropbox等）
- 统一的同步API
- 可定制的UI组件
- 事件驱动的同步状态管理
- 完全类型化的API（TypeScript）

## 安装

```bash
npm install universal-sync pouchdb
```

## 快速开始

### 基本用法

```javascript
import PouchDB from 'pouchdb';
import { createSyncController, WebDAVAdapter } from 'universal-sync';

// 创建PouchDB实例
const db = new PouchDB('my-database');

// 创建WebDAV适配器
const webdavAdapter = new WebDAVAdapter();

// 初始化同步控制器
const syncContainer = document.getElementById('sync-container');
const controller = createSyncController(syncContainer, {
  pouchDbInstance: db,
  adapters: [webdavAdapter]
});

// 监听同步事件
controller.addEventListener('sync-event', (event) => {
  console.log('同步事件:', event.detail);
});
```

### 手动控制同步

```javascript
import PouchDB from 'pouchdb';
import { WebDAVAdapter } from 'universal-sync';

// 创建PouchDB实例
const db = new PouchDB('my-database');

// 创建WebDAV适配器
const adapter = new WebDAVAdapter();

// 连接到WebDAV服务器
await adapter.connect({
  url: 'https://example.com/webdav',
  username: 'user',
  password: 'password',
  dbPath: 'pouchdb-sync'
});

// 开始同步
await adapter.startSync(db);

// 监听同步事件
adapter.addEventListener('sync-progress', (data) => {
  console.log(`同步进度: ${data.status.progress}%`);
});

// 停止同步
adapter.stopSync();
```

## 支持的同步后端

### 当前支持

- WebDAV

### 计划支持

- RemoteStorage
- Dropbox
- Google Drive
- NextCloud
- OneDrive

## 自定义适配器

你可以通过实现`SyncAdapter`接口来创建自定义的同步适配器：

```typescript
import { BaseSyncAdapter } from 'universal-sync';

class MyCustomAdapter extends BaseSyncAdapter {
  readonly name = 'MyCustomSync';
  
  async connect(config: Record<string, any>): Promise<boolean> {
    // 实现连接逻辑
    return true;
  }
  
  async startSync(localDB: PouchDB.Database): Promise<void> {
    // 实现同步逻辑
  }
}
```

## API文档

详细的API文档可以通过以下命令生成：

```bash
npm run docs
```

生成的文档将位于`docs`目录中。

## 开发

### 安装依赖

```bash
npm install
```

### 构建

```bash
npm run build
```

### 开发模式

```bash
npm run dev
```

### 运行示例

```bash
npm start
```

### 运行测试

```bash
npm test
```

## 许可证

MIT