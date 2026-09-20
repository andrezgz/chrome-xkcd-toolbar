/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
const { installKeyboardNavigation } = require("../content.js");

function press(key, overrides = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...overrides
  });
  document.dispatchEvent(event);
  return event;
}

describe("installKeyboardNavigation", () => {
  let openSpy;

  beforeEach(() => {
    installKeyboardNavigation();
    openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
  });

  test("E opens Explain XKCD in a new tab", () => {
    press("e");
    expect(openSpy).toHaveBeenCalledWith(
      "https://www.explainxkcd.com/wiki/index.php/353",
      "_blank",
      "noopener"
    );
  });

  test("D downloads the comic", () => {
    document.body.innerHTML = '<div id="comic"><img src="/x.png" title="joke"></div>';
    press("d");
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });

  test("T toggles the title", () => {
    document.body.innerHTML = '<div id="comic"><img src="/x.png" title="joke"></div>';
    press("t");
    expect(document.getElementById("xkcd-toolbar-title")).not.toBeNull();
  });

  test("ignores the key when a modifier is held", () => {
    press("e", { ctrlKey: true });
    expect(openSpy).not.toHaveBeenCalled();
  });

  test("ignores the key while typing in an input field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "e",
      bubbles: true,
      cancelable: true
    });
    input.dispatchEvent(event);

    expect(openSpy).not.toHaveBeenCalled();
  });

  test("only installs the handler once", () => {
    const addSpy = jest.spyOn(document, "addEventListener");
    installKeyboardNavigation();
    expect(addSpy).not.toHaveBeenCalled();
  });
});
