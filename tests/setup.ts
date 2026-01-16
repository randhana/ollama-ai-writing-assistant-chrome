// Jest setup for Chrome extension testing

// Mock Chrome APIs
Object.assign(global, {
  chrome: {
    runtime: {
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn()
      },
      openOptionsPage: jest.fn()
    },
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn()
      }
    },
    contextMenus: {
      create: jest.fn(),
      removeAll: jest.fn(),
      onClicked: {
        addListener: jest.fn()
      }
    },
    tabs: {
      query: jest.fn(),
      sendMessage: jest.fn()
    },
    action: {
      onClicked: {
        addListener: jest.fn()
      }
    }
  }
});

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock URL constructor
global.URL = class URL {
  constructor(public href: string) {
    this.protocol = href.startsWith('https:') ? 'https:' : 'http:';
  }
  protocol: string;
};

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});