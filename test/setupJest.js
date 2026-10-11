beforeEach(() => {
  global.chrome = {
    runtime: {
      id: "test-extension-id",
      sendMessage: jest.fn(),
      onMessage: { addListener: jest.fn() }
    },
    downloads: {
      download: jest.fn()
    }
  };

  document.body.innerHTML = "";
  document.head.innerHTML = "";
  jest.resetModules();
});
