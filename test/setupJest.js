beforeEach(() => {
  global.chrome = {
    runtime: {
      id: "test-extension-id",
      sendMessage: jest.fn(),
      onMessage: { addListener: jest.fn() }
    },
    downloads: {
      download: jest.fn()
    },
    storage: {
      sync: {
        get: jest.fn(defaults => Promise.resolve({ ...defaults })),
        set: jest.fn(() => Promise.resolve())
      },
      onChanged: { addListener: jest.fn() }
    }
  };

  document.body.innerHTML = "";
  document.head.innerHTML = "";
  jest.resetModules();
});
