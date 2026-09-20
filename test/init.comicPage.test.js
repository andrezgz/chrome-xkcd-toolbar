/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
describe("init on a comic page", () => {
  test("creates the panel and installs keyboard navigation", () => {
    require("../content.js");

    expect(document.getElementById("xkcd-toolbar-panel")).not.toBeNull();
    expect(document.querySelector(".xkcd-number").textContent).toBe("#353");
    expect(window.__xkcdToolbarKeyHandler).toBe(true);
  });
});
