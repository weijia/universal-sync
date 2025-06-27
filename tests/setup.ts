// 设置测试环境
import '@testing-library/jest-dom';

// 模拟 PouchDB
jest.mock('pouchdb', () => {
  return jest.fn().mockImplementation(() => {
    return {
      sync: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        cancel: jest.fn()
      }),
      close: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      allDocs: jest.fn().mockResolvedValue({ rows: [] }),
      changes: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        cancel: jest.fn()
      })
    };
  });
});

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 模拟 customElements
if (!window.customElements) {
  window.customElements = {
    define: jest.fn(),
    get: jest.fn(),
    upgrade: jest.fn(),
    whenDefined: jest.fn()
  } as unknown as CustomElementRegistry;
}

// 模拟 ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// 模拟 IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  
  callback: IntersectionObserverCallback;
  root = null;
  rootMargin = '';
  thresholds = [0];
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = () => [] as IntersectionObserverEntry[];
};

// 模拟 fetch
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    headers: new Headers(),
    status: 200,
    statusText: 'OK',
    type: 'basic',
    url: 'https://example.com'
  })
);