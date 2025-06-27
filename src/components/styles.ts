/**
 * 组件样式定义
 */

/**
 * 同步控制器组件样式
 */
export const syncControllerStyles = `
  :host {
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: #333;
    --primary-color: #4a6ee0;
    --error-color: #e74c3c;
    --success-color: #2ecc71;
    --warning-color: #f39c12;
    --border-color: #e0e0e0;
    --background-color: #ffffff;
    --text-color: #333333;
  }

  .sync-container {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    background-color: var(--background-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .sync-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .sync-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .sync-adapters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .sync-adapter {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sync-adapter:hover {
    background-color: #f5f5f5;
  }

  .sync-adapter.active {
    border-color: var(--primary-color);
    background-color: rgba(74, 110, 224, 0.05);
  }

  .sync-adapter-icon {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  .sync-adapter-name {
    font-size: 14px;
    font-weight: 500;
  }

  .sync-status {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    padding: 8px 12px;
    border-radius: 6px;
    background-color: #f5f5f5;
  }

  .sync-status-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }

  .sync-status-text {
    font-size: 14px;
    flex-grow: 1;
  }

  .sync-progress {
    height: 4px;
    width: 100%;
    background-color: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .sync-progress-bar {
    height: 100%;
    background-color: var(--primary-color);
    width: 0%;
    transition: width 0.3s ease;
  }

  .sync-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .sync-button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sync-button-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .sync-button-primary:hover {
    background-color: #3a5dcc;
  }

  .sync-button-secondary {
    background-color: #f5f5f5;
    color: #333;
  }

  .sync-button-secondary:hover {
    background-color: #e0e0e0;
  }

  .sync-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sync-error {
    color: var(--error-color);
    font-size: 14px;
    margin-top: 8px;
    padding: 8px 12px;
    background-color: rgba(231, 76, 60, 0.1);
    border-radius: 4px;
    border-left: 3px solid var(--error-color);
  }

  .sync-config-form {
    margin-top: 16px;
    border-top: 1px solid var(--border-color);
    padding-top: 16px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .form-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(74, 110, 224, 0.2);
  }

  .form-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .form-checkbox input {
    margin: 0;
  }

  .form-checkbox label {
    font-size: 14px;
  }

  .sync-status-idle { color: #7f8c8d; }
  .sync-status-connecting { color: #3498db; }
  .sync-status-connected { color: #2ecc71; }
  .sync-status-syncing { color: #3498db; }
  .sync-status-paused { color: #f39c12; }
  .sync-status-completed { color: #2ecc71; }
  .sync-status-error { color: #e74c3c; }
`;