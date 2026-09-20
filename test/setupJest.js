beforeEach(() => {
  global.chrome = {
    runtime: {
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
