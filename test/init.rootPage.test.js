/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/"}
 */
describe("init on the root page (latest comic, no number in the URL)", () => {
  test("creates the panel using the comic number from the permalink", () => {
    document.body.innerHTML = `
      <div id="middleContainer" class="box">
        <div id="comic"><img src="/comic.png" title="joke"></div>
        Permanent link to this comic: <a href="https://xkcd.com/3300">https://xkcd.com/3300/</a>
      </div>
    `;

    require("../content.js");

    expect(document.getElementById("xkcd-toolbar-panel")).not.toBeNull();
    expect(document.querySelector(".xkcd-number").textContent).toBe("#3300");
  });
});
