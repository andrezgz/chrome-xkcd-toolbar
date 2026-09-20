/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
const { installKeyboardNavigation, createPanel } = require("../content.js");

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

describe("goToComic via the G shortcut", () => {
  let promptSpy;

  beforeEach(() => {
    installKeyboardNavigation();
    promptSpy = jest.spyOn(window, "prompt").mockReturnValue(null);
  });

  test("prompts for a comic number", () => {
    press("g");
    expect(promptSpy).toHaveBeenCalledWith("Go to comic #:");
  });

  test("does not throw when the prompt is cancelled", () => {
    promptSpy.mockReturnValue(null);
    expect(() => press("g")).not.toThrow();
  });

  test("does not throw for invalid input", () => {
    promptSpy.mockReturnValue("not a number");
    expect(() => press("g")).not.toThrow();
  });

  test("ignores the key when a modifier is held", () => {
    press("g", { ctrlKey: true });
    expect(promptSpy).not.toHaveBeenCalled();
  });

  test("ignores the key while typing in an input field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "g",
      bubbles: true,
      cancelable: true
    });
    input.dispatchEvent(event);

    expect(promptSpy).not.toHaveBeenCalled();
  });
});

describe("goToComic via clicking the comic number badge", () => {
  test("prompts for a comic number when clicked", () => {
    createPanel(353);
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValue(null);

    document.querySelector(".xkcd-number").click();

    expect(promptSpy).toHaveBeenCalledWith("Go to comic #:");
  });
});
