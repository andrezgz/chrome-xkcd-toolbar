const { permalinkComicNumber } = require("../content.js");

describe("permalinkComicNumber", () => {
  test("reads the comic number from the permanent-link anchor", () => {
    document.body.innerHTML = `
      <div id="middleContainer" class="box">
        Permanent link to this comic: <a href="https://xkcd.com/3300">https://xkcd.com/3300/</a>
      </div>
    `;

    expect(permalinkComicNumber()).toBe(3300);
  });

  test("returns null when there is no permalink anchor", () => {
    document.body.innerHTML = '<div id="middleContainer" class="box"></div>';

    expect(permalinkComicNumber()).toBeNull();
  });

  test("returns null when there is no middleContainer at all", () => {
    document.body.innerHTML = "";

    expect(permalinkComicNumber()).toBeNull();
  });
});
