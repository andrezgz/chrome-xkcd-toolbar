/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
let api;

// The key handler is installed once per window and stays bound to the module
// instance that installed it, so share a single instance across this file and
// reload its state explicitly in each test.
beforeEach(() => {
  sessionStorage.clear();
  document.body.innerHTML = '<div id="comic"><img src="/x.png" title="joke"></div>';
  api ??= require("../content.js");
});

const flush = () => new Promise(resolve => setTimeout(resolve));

async function loadWith(values) {
  if (values) {
    chrome.storage.sync.get.mockImplementation(defaults => Promise.resolve({ ...defaults, ...values }));
  }
  await api.loadTrackingState(353);
  await flush();
}

const readButton = () => document.querySelector("#xkcd-toolbar-panel .xkcd-read");
const favoriteButton = () => document.querySelector("#xkcd-toolbar-panel .xkcd-favorite");
const modeButton = mode => document.querySelector(`#xkcd-toolbar-panel .xkcd-mode-${mode}`);
const prevHref = () => document.querySelectorAll("#xkcd-toolbar-panel a")[0].getAttribute("href");
const nextHref = () => document.querySelectorAll("#xkcd-toolbar-panel a")[1].getAttribute("href");

function press(key, overrides = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...overrides });
  document.dispatchEvent(event);
  return event;
}

describe("read tracking", () => {
  test("the first visit shows 👀 and records the comic as seen", async () => {
    await loadWith();

    expect(readButton().textContent).toBe("👀");
    await flush();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ seenRanges: "353" });
  });

  test("a later visit shows ✓ and writes nothing", async () => {
    await loadWith({ seenRanges: "300-400" });

    expect(readButton().textContent).toBe("✓");
    await flush();
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test("clicking removes the comic from the history and shows ✗", async () => {
    await loadWith({ seenRanges: "300-400" });
    readButton().click();

    expect(readButton().textContent).toBe("✗");
    await flush();
    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith({ seenRanges: "300-352,354-400" });
  });

  test("clicking 👀 marks it unread so the next visit shows 👀 again", async () => {
    await loadWith();
    readButton().click();

    await flush();

    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith({ seenRanges: "" });
  });

  test("U toggles unread/read and clicking ✗ marks it read again", async () => {
    await loadWith({ seenRanges: "353" });

    press("u");
    expect(readButton().textContent).toBe("✗");
    press("u");
    expect(readButton().textContent).toBe("✓");
    await flush();
    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith({ seenRanges: "353" });
  });

  test("no tracking controls are shown when storage is unavailable", async () => {
    chrome.storage.sync.get.mockRejectedValue(new Error("nope"));
    api.createPanel(353);
    chrome.storage.sync.get.mockRejectedValue(new Error("unavailable"));
    jest.resetModules();
    require("../content.js");
    await new Promise(resolve => setTimeout(resolve));

    expect(document.getElementById("xkcd-toolbar-panel")).not.toBeNull();
    expect(readButton()).toBeNull();
  });
});

describe("favorites", () => {
  test("starts as ☆ and F toggles ⭐, saving the set", async () => {
    await loadWith();

    expect(favoriteButton().textContent).toBe("☆");
    press("f");
    expect(favoriteButton().textContent).toBe("⭐");
    await flush();
    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith({ favorites: "353" });
    favoriteButton().click();
    expect(favoriteButton().textContent).toBe("☆");
  });

  test("Shift+F enables favorites mode and Prev/Next follow the favorites", async () => {
    await loadWith({ seenRanges: "353", favorites: "10,50,400" });

    press("F", { shiftKey: true });

    expect(modeButton("favorites").getAttribute("aria-pressed")).toBe("true");
    expect(prevHref()).toBe("https://xkcd.com/50/");
    expect(nextHref()).toBe("https://xkcd.com/400/");
  });

  test("Shift+F again and Escape leave the mode", async () => {
    await loadWith();

    press("F", { shiftKey: true });
    press("F", { shiftKey: true });
    expect(modeButton("favorites").getAttribute("aria-pressed")).toBe("false");

    press("F", { shiftKey: true });
    press("Escape");
    expect(modeButton("favorites").getAttribute("aria-pressed")).toBe("false");
    expect(nextHref()).toBe("https://xkcd.com/354/");
  });

  test("a mode with nothing further keeps the link on the current comic", async () => {
    await loadWith({ seenRanges: "353", favorites: "10" });
    press("F", { shiftKey: true });

    expect(nextHref()).toBe("https://xkcd.com/353/");
  });

  test("the mode survives a reload through sessionStorage", async () => {
    await loadWith({ seenRanges: "353", favorites: "10,400" });
    press("F", { shiftKey: true });

    jest.resetModules();
    const reloaded = require("../content.js");
    await reloaded.loadTrackingState(353);

    expect(modeButton("favorites").getAttribute("aria-pressed")).toBe("true");
    expect(nextHref()).toBe("https://xkcd.com/400/");
  });
});

describe("unread mode", () => {
  test("Shift+U makes Prev/Next skip read comics", async () => {
    await loadWith({ seenRanges: "1-117,160-190,353" });
    press("U", { shiftKey: true });

    expect(modeButton("unread").getAttribute("aria-pressed")).toBe("true");
    expect(modeButton("favorites").getAttribute("aria-pressed")).toBe("false");
    expect(prevHref()).toBe("https://xkcd.com/352/");

    api.importReadRanges([[1, 117], [160, 190]]);
    expect(api.navigationTarget(190, 1)).toBe(191);
    expect(api.navigationTarget(160, -1)).toBe(159);
  });

  test("entering one mode replaces the other", async () => {
    await loadWith();
    press("F", { shiftKey: true });
    press("U", { shiftKey: true });

    expect(modeButton("favorites").getAttribute("aria-pressed")).toBe("false");
    expect(modeButton("unread").getAttribute("aria-pressed")).toBe("true");
  });

  test("Alt+Shift combinations are ignored", async () => {
    await loadWith();
    press("F", { shiftKey: true, altKey: true });

    expect(modeButton("favorites").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("import dialog", () => {
  const dialog = () => document.getElementById("xkcd-toolbar-import");
  const importButton = () => dialog().querySelector("button");

  test("Shift+I opens it and Escape closes it", async () => {
    await loadWith();

    press("I", { shiftKey: true });
    expect(dialog()).not.toBeNull();
    dialog().querySelector("textarea").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    expect(dialog()).toBeNull();
  });

  test("warns in red that the history is replaced", async () => {
    await loadWith();
    api.init(); // setupJest empties <head>; init re-adds the stylesheet
    api.openImportDialog();

    const warning = dialog().querySelector(".xkcd-import-warning");
    expect(warning.textContent).toBe("This replaces your whole read history.");
    expect(document.getElementById("xkcd-toolbar-style").textContent).toMatch(
      /\.xkcd-import-warning\s*\{\s*color: #c00/
    );
  });

  test("plain I does nothing", async () => {
    await loadWith();
    press("i");

    expect(dialog()).toBeNull();
  });

  test("imports the typed ranges, replacing the history", async () => {
    await loadWith();
    api.openImportDialog();

    expect(importButton().disabled).toBe(true);
    const textarea = dialog().querySelector("textarea");
    textarea.value = "1-117\n160..190";
    textarea.dispatchEvent(new Event("input"));

    expect(importButton().disabled).toBe(false);
    expect(dialog().textContent).toContain("148 comics in 2 range(s)");
    importButton().click();

    await flush();

    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith({ seenRanges: "1-117,160-190" });
    expect(dialog()).toBeNull();
    expect(readButton().textContent).toBe("✗");
  });

  test("refuses to import when a line is not a range", async () => {
    await loadWith();
    api.openImportDialog();
    const textarea = dialog().querySelector("textarea");
    textarea.value = "1-117\nnope";
    textarea.dispatchEvent(new Event("input"));

    expect(importButton().disabled).toBe(true);
    expect(dialog().textContent).toContain("Unrecognized line: nope");
  });
});

describe("concurrent changes", () => {
  test("writes merge into what another tab stored instead of overwriting it", async () => {
    await loadWith({ seenRanges: "353" });
    // Another tab recorded comic 500 after this one loaded its copy.
    chrome.storage.sync.get.mockImplementation(defaults =>
      Promise.resolve({ ...defaults, seenRanges: "353,500" })
    );

    readButton().click();
    await flush();

    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith({ seenRanges: "500" });
  });

  test("rapid toggles are written one after another", async () => {
    await loadWith({ seenRanges: "353" });
    const order = [];
    chrome.storage.sync.set.mockImplementation(async values => {
      await flush();
      order.push(values.seenRanges);
    });

    api.toggleRead(353);
    api.toggleRead(353);
    await flush();
    await flush();
    await flush();

    expect(order).toEqual(["", "353"]);
  });

  test("changes from other tabs update the panel", async () => {
    await loadWith({ seenRanges: "353", favorites: "" });
    const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];

    listener({ favorites: { newValue: "353,400" } }, "sync");
    expect(favoriteButton().textContent).toBe("⭐");

    listener({ favorites: { newValue: "" } }, "local");
    expect(favoriteButton().textContent).toBe("⭐");
  });
});

describe("import replaces the history", () => {
  test("comics read before the import are dropped from storage", async () => {
    await loadWith({ seenRanges: "1-50,353,900-950" });
    api.importReadRanges([[1, 117], [160, 190]]);
    await flush();

    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith({ seenRanges: "1-117,160-190" });
    expect(api.navigationTarget(950, -1)).toBe(949);
  });
});

describe("prefetch follows the navigation mode", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn(() => Promise.resolve({ ok: false }));
    global.fetch = fetchMock;
  });

  afterEach(() => {
    delete global.fetch;
  });

  const fetched = () => fetchMock.mock.calls.map(([url]) => url);
  // The module remembers what it already prefetched, so each test uses
  // comic numbers no other test touches.

  test("entering favorites mode prefetches the neighbouring favorites, not n±1", async () => {
    await loadWith({ seenRanges: "353", favorites: "11,51,401" });
    fetchMock.mockClear();

    api.toggleNavMode("favorites");
    await flush();

    expect(fetched()).toEqual(["https://xkcd.com/51/", "https://xkcd.com/401/"]);
  });

  test("toggling the mode again does not prefetch the same comics twice", async () => {
    await loadWith({ seenRanges: "353", favorites: "12,52,402" });
    fetchMock.mockClear();

    api.toggleNavMode("favorites");
    api.toggleNavMode("favorites");
    api.toggleNavMode("favorites");
    await flush();

    expect(fetched()).toHaveLength(2);
  });

  test("without a mode nothing extra is prefetched", async () => {
    await loadWith({ seenRanges: "353" });
    fetchMock.mockClear();
    await api.prefetchNavigationTargets(700);

    expect(fetched()).toEqual(["https://xkcd.com/699/", "https://xkcd.com/701/"]);
  });
});

describe("panel layout", () => {
  test("the mode buttons lead the panel and the read icon and star follow the comic number", async () => {
    await loadWith({ seenRanges: "353" });

    const panel = document.getElementById("xkcd-toolbar-panel");
    const classes = [...panel.children].map(el => el.className);
    const badge = classes.indexOf("xkcd-number");

    expect(classes.slice(badge, badge + 3)).toEqual(["xkcd-number", "xkcd-read", "xkcd-favorite"]);
    // The mode buttons come first, before Prev, since they steer Prev/Next.
    expect(classes.slice(0, 2)).toEqual(["xkcd-mode-favorites", "xkcd-mode-unread"]);
    expect(panel.querySelector("a")).toBe(panel.children[3]);
  });
});
