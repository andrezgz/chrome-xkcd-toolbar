/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
let createPanel;
let loadTitlePinned;
let toggleTitlePinned;

// The pin state lives in the module, so load a fresh copy for every test
// (setupJest resets the module registry before each one).
beforeEach(() => {
  ({ createPanel, loadTitlePinned, toggleTitlePinned } = require("../content.js"));
});

function renderComic() {
  document.body.innerHTML = '<div id="comic"><img src="/x.png" title="joke"></div>';
  createPanel(353);
}

const titleButton = () => document.querySelector("#xkcd-toolbar-panel .xkcd-title-button");
const titleEl = () => document.getElementById("xkcd-toolbar-title");

describe("pinned title", () => {
  test("the Title button starts unpressed", () => {
    renderComic();
    expect(titleButton().getAttribute("aria-pressed")).toBe("false");
  });

  test("toggleTitlePinned shows the title, highlights the button and saves", () => {
    renderComic();
    toggleTitlePinned();

    expect(titleEl()).not.toBeNull();
    expect(titleButton().getAttribute("aria-pressed")).toBe("true");
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ pinTitle: true });
  });

  test("toggling again unpins and saves false, leaving the visible title alone", () => {
    renderComic();
    toggleTitlePinned();
    toggleTitlePinned();

    expect(titleButton().getAttribute("aria-pressed")).toBe("false");
    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith({ pinTitle: false });
    expect(titleEl()).not.toBeNull();
  });

  test("pinning does not duplicate an already visible title", () => {
    renderComic();
    document.querySelector("#xkcd-toolbar-panel .xkcd-title-button").click();
    toggleTitlePinned();

    expect(document.querySelectorAll("#xkcd-toolbar-title")).toHaveLength(1);
  });

  test("loadTitlePinned shows the title and highlights when the stored value is true", async () => {
    chrome.storage.sync.get.mockResolvedValue({ pinTitle: true });
    renderComic();
    await loadTitlePinned();

    expect(titleEl()).not.toBeNull();
    expect(titleButton().getAttribute("aria-pressed")).toBe("true");
  });

  test("loadTitlePinned leaves the title hidden when nothing is stored", async () => {
    renderComic();
    await loadTitlePinned();

    expect(titleEl()).toBeNull();
    expect(titleButton().getAttribute("aria-pressed")).toBe("false");
  });

  test("a rebuilt panel keeps the pressed state", () => {
    renderComic();
    toggleTitlePinned();
    createPanel(353);

    expect(titleButton().getAttribute("aria-pressed")).toBe("true");
  });
});
