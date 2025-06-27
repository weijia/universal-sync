/**
 * 同步控制器Web组件
 * 提供UI界面来管理同步
 */
import { SyncAdapter, SyncEventData, SyncStatus } from '../interfaces/SyncAdapter';
import { syncControllerStyles } from './styles';

/**
 * 同步控制器配置
 */
export interface SyncControllerConfig {
  /**
   * 可用的同步适配器
   */
  adapters: SyncAdapter[];
  
  /**
   * 本地数据库实例
   */
  localDB: PouchDB.Database;
  
  /**
   * 默认选择的适配器索引
   */
  defaultAdapterIndex?: number;
  
  /**
   * 是否自动连接
   */
  autoConnect?: boolean;
  
  /**
   * 是否显示适配器选择
   */
  showAdapterSelection?: boolean;
  
  /**
   * 是否显示配置表单
   */
  showConfigForm?: boolean;
  
  /**
   * 是否显示同步状态
   */
  showStatus?: boolean;
  
  /**
   * 是否显示同步进度
   */
  showProgress?: boolean;
  
  /**
   * 是否显示同步按钮
   */
  showSyncButton?: boolean;
  
  /**
   * 是否显示停止按钮
   */
  showStopButton?: boolean;
}

/**
 * 同步控制器Web组件
 * 提供UI界面来管理同步
 */
export class SyncController extends HTMLElement {
  /**
   * 组件配置
   */
  private config: SyncControllerConfig | null = null;
  
  /**
   * 当前选择的适配器
   */
  private currentAdapter: SyncAdapter | null = null;
  
  /**
   * 当前同步状态
   */
  private syncStatus: SyncStatus = { status: 'idle' };
  
  /**
   * Shadow DOM
   */
  private shadow: ShadowRoot;
  
  /**
   * 组件元素
   */
  private elements: {
    container: HTMLDivElement;
    adaptersList: HTMLDivElement;
    statusText: HTMLDivElement;
    progressBar: HTMLDivElement;
    errorMessage: HTMLDivElement;
    configForm: HTMLFormElement;
    syncButton: HTMLButtonElement;
    stopButton: HTMLButtonElement;
  };
  
  /**
   * 构造函数
   */
  constructor() {
    super();
    
    // 创建Shadow DOM
    this.shadow = this.attachShadow({ mode: 'open' });
    
    // 创建样式
    const style = document.createElement('style');
    style.textContent = syncControllerStyles;
    this.shadow.appendChild(style);
    
    // 创建组件结构
    const container = document.createElement('div');
    container.className = 'sync-container';
    this.shadow.appendChild(container);
    
    // 创建标题
    const header = document.createElement('div');
    header.className = 'sync-header';
    container.appendChild(header);
    
    const title = document.createElement('h2');
    title.className = 'sync-title';
    title.textContent = '数据同步';
    header.appendChild(title);
    
    // 创建适配器列表
    const adaptersList = document.createElement('div');
    adaptersList.className = 'sync-adapters';
    container.appendChild(adaptersList);
    
    // 创建状态显示
    const statusContainer = document.createElement('div');
    statusContainer.className = 'sync-status';
    container.appendChild(statusContainer);
    
    const statusIcon = document.createElement('span');
    statusIcon.className = 'sync-status-icon';
    statusContainer.appendChild(statusIcon);
    
    const statusText = document.createElement('div');
    statusText.className = 'sync-status-text';
    statusText.textContent = '空闲';
    statusContainer.appendChild(statusText);
    
    // 创建进度条
    const progressContainer = document.createElement('div');
    progressContainer.className = 'sync-progress';
    container.appendChild(progressContainer);
    
    const progressBar = document.createElement('div');
    progressBar.className = 'sync-progress-bar';
    progressContainer.appendChild(progressBar);
    
    // 创建错误消息
    const errorMessage = document.createElement('div');
    errorMessage.className = 'sync-error';
    errorMessage.style.display = 'none';
    container.appendChild(errorMessage);
    
    // 创建配置表单
    const configForm = document.createElement('form');
    configForm.className = 'sync-config-form';
    configForm.style.display = 'none';
    container.appendChild(configForm);
    
    // 创建操作按钮
    const actions = document.createElement('div');
    actions.className = 'sync-actions';
    container.appendChild(actions);
    
    const syncButton = document.createElement('button');
    syncButton.className = 'sync-button sync-button-primary';
    syncButton.textContent = '同步';
    syncButton.disabled = true;
    actions.appendChild(syncButton);
    
    const stopButton = document.createElement('button');
    stopButton.className = 'sync-button sync-button-secondary';
    stopButton.textContent = '停止';
    stopButton.disabled = true;
    actions.appendChild(stopButton);
    
    // 保存元素引用
    this.elements = {
      container,
      adaptersList,
      statusText,
      progressBar,
      errorMessage,
      configForm,
      syncButton,
      stopButton
    };
    
    // 添加事件监听器
    syncButton.addEventListener('click', this.handleSyncClick.bind(this));
    stopButton.addEventListener('click', this.handleStopClick.bind(this));
    configForm.addEventListener('submit', this.handleConfigSubmit.bind(this));
  }
  
  /**
   * 当组件连接到DOM时调用
   */
  connectedCallback() {
    // 从属性中获取配置
    const configAttr = this.getAttribute('config');
    
    if (configAttr) {
      try {
        const config = JSON.parse(configAttr);
        this.initialize(config);
      } catch (error) {
        console.error('无法解析同步控制器配置:', error);
      }
    }
  }
  
  /**
   * 初始化组件
   * @param config 组件配置
   */
  initialize(config: SyncControllerConfig) {
    this.config = {
      ...config,
      showAdapterSelection: config.showAdapterSelection !== false,
      showConfigForm: config.showConfigForm !== false,
      showStatus: config.showStatus !== false,
      showProgress: config.showProgress !== false,
      showSyncButton: config.showSyncButton !== false,
      showStopButton: config.showStopButton !== false
    };
    
    // 渲染适配器列表
    this.renderAdapters();
    
    // 设置可见性
    this.elements.adaptersList.style.display = this.config.showAdapterSelection ? 'flex' : 'none';
    this.elements.statusText.parentElement!.style.display = this.config.showStatus ? 'flex' : 'none';
    this.elements.progressBar.parentElement!.style.display = this.config.showProgress ? 'block' : 'none';
    this.elements.syncButton.style.display = this.config.showSyncButton ? 'block' : 'none';
    this.elements.stopButton.style.display = this.config.showStopButton ? 'block' : 'none';
    
    // 选择默认适配器
    if (this.config.adapters.length > 0) {
      const adapterIndex = this.config.defaultAdapterIndex || 0;
      if (adapterIndex < this.config.adapters.length) {
        this.selectAdapter(this.config.adapters[adapterIndex]);
      }
    }
    
    // 自动连接
    if (this.config.autoConnect && this.currentAdapter) {
      // 这里需要从存储中获取配置
      const savedConfig = this.getSavedConfig();
      if (savedConfig) {
        this.connectAdapter(savedConfig);
      }
    }
  }
  
  /**
   * 渲染适配器列表
   */
  private renderAdapters() {
    if (!this.config) return;
    
    // 清空列表
    this.elements.adaptersList.innerHTML = '';
    
    // 添加适配器
    this.config.adapters.forEach(adapter => {
      const adapterElement = document.createElement('div');
      adapterElement.className = 'sync-adapter';
      adapterElement.dataset.adapterName = adapter.name;
      
      // 添加图标
      if (adapter.iconUrl) {
        const icon = document.createElement('img');
        icon.className = 'sync-adapter-icon';
        icon.src = adapter.iconUrl;
        icon.alt = adapter.name;
        adapterElement.appendChild(icon);
      }
      
      // 添加名称
      const name = document.createElement('span');
      name.className = 'sync-adapter-name';
      name.textContent = adapter.name;
      adapterElement.appendChild(name);
      
      // 添加点击事件
      adapterElement.addEventListener('click', () => {
        this.selectAdapter(adapter);
      });
      
      this.elements.adaptersList.appendChild(adapterElement);
    });
  }
  
  /**
   * 选择适配器
   * @param adapter 要选择的适配器
   */
  private selectAdapter(adapter: SyncAdapter) {
    // 移除之前的事件监听器
    if (this.currentAdapter) {
      this.removeAdapterEventListeners(this.currentAdapter);
    }
    
    // 设置当前适配器
    this.currentAdapter = adapter;
    
    // 更新UI
    const adapterElements = this.elements.adaptersList.querySelectorAll('.sync-adapter');
    adapterElements.forEach(element => {
      if (element.dataset.adapterName === adapter.name) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    });
    
    // 渲染配置表单
    this.renderConfigForm();
    
    // 添加事件监听器
    this.addAdapterEventListeners(adapter);
    
    // 更新状态
    this.updateStatus(adapter.getSyncStatus());
    
    // 启用同步按钮
    this.elements.syncButton.disabled = false;
  }
  
  /**
   * 渲染配置表单
   */
  private renderConfigForm() {
    if (!this.config || !this.currentAdapter) return;
    
    // 清空表单
    this.elements.configForm.innerHTML = '';
    
    // 根据适配器类型创建表单
    switch (this.currentAdapter.name) {
      case 'WebDAV':
        this.createWebDAVForm();
        break;
      // 可以添加其他适配器的表单
      default:
        // 默认表单
        this.elements.configForm.innerHTML = '<p>此适配器不需要配置</p>';
    }
    
    // 显示表单
    if (this.config.showConfigForm) {
      this.elements.configForm.style.display = 'block';
    }
  }
  
  /**
   * 创建WebDAV配置表单
   */
  private createWebDAVForm() {
    // 获取保存的配置
    const savedConfig = this.getSavedConfig() || {};
    
    // URL
    const urlGroup = document.createElement('div');
    urlGroup.className = 'form-group';
    
    const urlLabel = document.createElement('label');
    urlLabel.className = 'form-label';
    urlLabel.textContent = 'WebDAV服务器URL';
    urlLabel.htmlFor = 'webdav-url';
    urlGroup.appendChild(urlLabel);
    
    const urlInput = document.createElement('input');
    urlInput.className = 'form-input';
    urlInput.type = 'url';
    urlInput.id = 'webdav-url';
    urlInput.name = 'url';
    urlInput.placeholder = 'https://example.com/webdav/';
    urlInput.required = true;
    urlInput.value = savedConfig.url || '';
    urlGroup.appendChild(urlInput);
    
    this.elements.configForm.appendChild(urlGroup);
    
    // 用户名
    const usernameGroup = document.createElement('div');
    usernameGroup.className = 'form-group';
    
    const usernameLabel = document.createElement('label');
    usernameLabel.className = 'form-label';
    usernameLabel.textContent = '用户名';
    usernameLabel.htmlFor = 'webdav-username';
    usernameGroup.appendChild(usernameLabel);
    
    const usernameInput = document.createElement('input');
    usernameInput.className = 'form-input';
    usernameInput.type = 'text';
    usernameInput.id = 'webdav-username';
    usernameInput.name = 'username';
    usernameInput.placeholder = '用户名';
    usernameInput.value = savedConfig.username || '';
    usernameGroup.appendChild(usernameInput);
    
    this.elements.configForm.appendChild(usernameGroup);
    
    // 密码
    const passwordGroup = document.createElement('div');
    passwordGroup.className = 'form-group';
    
    const passwordLabel = document.createElement('label');
    passwordLabel.className = 'form-label';
    passwordLabel.textContent = '密码';
    passwordLabel.htmlFor = 'webdav-password';
    passwordGroup.appendChild(passwordLabel);
    
    const passwordInput = document.createElement('input');
    passwordInput.className = 'form-input';
    passwordInput.type = 'password';
    passwordInput.id = 'webdav-password';
    passwordInput.name = 'password';
    passwordInput.placeholder = '密码';
    passwordInput.value = savedConfig.password || '';
    passwordGroup.appendChild(passwordInput);
    
    this.elements.configForm.appendChild(passwordGroup);
    
    // 数据库路径
    const dbPathGroup = document.createElement('div');
    dbPathGroup.className = 'form-group';
    
    const dbPathLabel = document.createElement('label');
    dbPathLabel.className = 'form-label';
    dbPathLabel.textContent = '数据库路径';
    dbPathLabel.htmlFor = 'webdav-dbpath';
    dbPathGroup.appendChild(dbPathLabel);
    
    const dbPathInput = document.createElement('input');
    dbPathInput.className = 'form-input';
    dbPathInput.type = 'text';
    dbPathInput.id = 'webdav-dbpath';
    dbPathInput.name = 'dbPath';
    dbPathInput.placeholder = '/sync/db';
    dbPathInput.value = savedConfig.dbPath || '';
    dbPathGroup.appendChild(dbPathInput);
    
    this.elements.configForm.appendChild(dbPathGroup);
    
    // 自动同步
    const autoSyncGroup = document.createElement('div');
    autoSyncGroup.className = 'form-group form-checkbox';
    
    const autoSyncInput = document.createElement('input');
    autoSyncInput.type = 'checkbox';
    autoSyncInput.id = 'webdav-autosync';
    autoSyncInput.name = 'autoSync';
    autoSyncInput.checked = savedConfig.autoSync !== false;
    autoSyncGroup.appendChild(autoSyncInput);
    
    const autoSyncLabel = document.createElement('label');
    autoSyncLabel.htmlFor = 'webdav-autosync';
    autoSyncLabel.textContent = '启用自动同步';
    autoSyncGroup.appendChild(autoSyncLabel);
    
    this.elements.configForm.appendChild(autoSyncGroup);
    
    // 同步间隔
    const syncIntervalGroup = document.createElement('div');
    syncIntervalGroup.className = 'form-group';
    
    const syncIntervalLabel = document.createElement('label');
    syncIntervalLabel.className = 'form-label';
    syncIntervalLabel.textContent = '同步间隔（分钟）';
    syncIntervalLabel.htmlFor = 'webdav-syncinterval';
    syncIntervalGroup.appendChild(syncIntervalLabel);
    
    const syncIntervalInput = document.createElement('input');
    syncIntervalInput.className = 'form-input';
    syncIntervalInput.type = 'number';
    syncIntervalInput.id = 'webdav-syncinterval';
    syncIntervalInput.name = 'syncInterval';
    syncIntervalInput.min = '1';
    syncIntervalInput.value = String((savedConfig.syncInterval || 60000) / 60000);
    syncIntervalGroup.appendChild(syncIntervalInput);
    
    this.elements.configForm.appendChild(syncIntervalGroup);
  }
  
  /**
   * 添加适配器事件监听器
   * @param adapter 适配器实例
   */
  private addAdapterEventListeners(adapter: SyncAdapter) {
    adapter.addEventListener('connect-success', this.handleAdapterEvent.bind(this));
    adapter.addEventListener('connect-error', this.handleAdapterEvent.bind(this));
    adapter.addEventListener('sync-progress', this.handleAdapterEvent.bind(this));
    adapter.addEventListener('sync-error', this.handleAdapterEvent.bind(this));
    adapter.addEventListener('sync-complete', this.handleAdapterEvent.bind(this));
    adapter.addEventListener('sync-paused', this.handleAdapterEvent.bind(this));
    adapter.addEventListener('sync-active', this.handleAdapterEvent.bind(this));
    adapter.addEventListener('sync-denied', this.handleAdapterEvent.bind(this));
    adapter.addEventListener('sync-stopped', this.handleAdapterEvent.bind(this));
  }
  
  /**
   * 移除适配器事件监听器
   * @param adapter 适配器实例
   */
  private removeAdapterEventListeners(adapter: SyncAdapter) {
    adapter.removeEventListener('connect-success', this.handleAdapterEvent.bind(this));
    adapter.removeEventListener('connect-error', this.handleAdapterEvent.bind(this));
    adapter.removeEventListener('sync-progress', this.handleAdapterEvent.bind(this));
    adapter.removeEventListener('sync-error', this.handleAdapterEvent.bind(this));
    adapter.removeEventListener('sync-complete', this.handleAdapterEvent.bind(this));
    adapter.removeEventListener('sync-paused', this.handleAdapterEvent.bind(this));
    adapter.removeEventListener('sync-active', this.handleAdapterEvent.bind(this));
    adapter.removeEventListener('sync-denied', this.handleAdapterEvent.bind(this));
    adapter.removeEventListener('sync-stopped', this.handleAdapterEvent.bind(this));
  }
  
  /**
   * 处理适配器事件
   * @param event 事件数据
   */
  private handleAdapterEvent(event: SyncEventData) {
    this.updateStatus(event.status);
    
    if (event.error) {
      this.showError(event.error.message);
    } else {
      this.hideError();
    }
    
    // 分发自定义事件
    this.dispatchEvent(new CustomEvent(event.type, {
      detail: event,
      bubbles: true,
      composed: true
    }));
  }
  
  /**
   * 更新状态显示
   * @param status 同步状态
   */
  private updateStatus(status: SyncStatus) {
    this.syncStatus = status;
    
    // 更新状态文本
    let statusText = '';
    switch (status.status) {
      case 'idle':
        statusText = '空闲';
        break;
      case 'connecting':
        statusText = '正在连接...';
        break;
      case 'connected':
        statusText = '已连接';
        break;
      case 'syncing':
        statusText = `正在同步${status.progress ? ` (${status.progress}%)` : ''}`;
        break;
      case 'paused':
        statusText = '已暂停';
        break;
      case 'completed':
        statusText = '同步完成';
        break;
      case 'error':
        statusText = '同步错误';
        break;
    }
    
    this.elements.statusText.textContent = statusText;
    
    // 更新状态类
    const statusClasses = [
      'sync-status-idle',
      'sync-status-connecting',
      'sync-status-connected',
      'sync-status-syncing',
      'sync-status-paused',
      'sync-status-completed',
      'sync-status-error'
    ];
    
    this.elements.statusText.classList.remove(...statusClasses);
    this.elements.statusText.classList.add(`sync-status-${status.status}`);
    
    // 更新进度条
    if (status.progress !== undefined) {
      (this.elements.progressBar as HTMLElement).style.width = `${status.progress}%`;
    }
    
    // 更新按钮状态
    this.elements.syncButton.disabled = status.status === 'syncing';
    this.elements.stopButton.disabled = status.status === 'idle' || status.status === 'completed';
  }
  
  /**
   * 显示错误消息
   * @param message 错误消息
   */
  private showError(message: string) {
    this.elements.errorMessage.textContent = message;
    (this.elements.errorMessage as HTMLElement).style.display = 'block';
  }
  
  /**
   * 隐藏错误消息
   */
  private hideError() {
    (this.elements.errorMessage as HTMLElement).style.display = 'none';
  }
  
  /**
   * 处理同步按钮点击
   */
  private async handleSyncClick() {
    if (!this.currentAdapter || !this.config) return;
    
    try {
      // 获取配置
      const formData = new FormData(this.elements.configForm);
      const config = Object.fromEntries(formData.entries());
      
      // 转换同步间隔为毫秒
      if (config.syncInterval) {
        config.syncInterval = Number(config.syncInterval) * 60000;
      }
      
      // 保存配置
      this.saveConfig(config);
      
      // 连接适配器
      await this.connectAdapter(config);
      
      // 开始同步
      await this.currentAdapter.startSync(this.config.localDB);
      
    } catch (error) {
      this.showError(error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * 处理停止按钮点击
   */
  private handleStopClick() {
    if (this.currentAdapter) {
      this.currentAdapter.stopSync();
    }
  }
  
  /**
   * 处理配置表单提交
   * @param event 表单提交事件
   */
  private handleConfigSubmit(event: Event) {
    event.preventDefault();
  }
  
  /**
   * 连接适配器
   * @param config 连接配置
   */
  private async connectAdapter(config: Record<string, any>) {
    if (!this.currentAdapter) return;
    
    const success = await this.currentAdapter.connect(config);
    
    if (!success) {
      throw new Error('连接失败');
    }
  }
  
  /**
   * 保存配置到本地存储
   * @param config 配置对象
   */
  private saveConfig(config: Record<string, any>) {
    if (!this.currentAdapter) return;
    
    const key = `sync-config-${this.currentAdapter.name}`;
    localStorage.setItem(key, JSON.stringify(config));
  }
  
  /**
   * 从本地存储获取配置
   * @returns 保存的配置对象
   */
  private getSavedConfig(): Record<string, any> | null {
    if (!this.currentAdapter) return null;
    
    const key = `sync-config-${this.currentAdapter.name}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    
    return null;
  }
}

// 注册Web组件
customElements.define('sync-controller', SyncController);