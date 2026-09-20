describe("init on a non-comic page", () => {
  test("does not create a panel", () => {
    require("../content.js");

    expect(document.getElementById("xkcd-toolbar-panel")).toBeNull();
  });
});
