const { toggleTitle } = require("../content.js");

function renderComic(title) {
  document.body.innerHTML = `<div id="comic"><img src="/comic.png" title="${title}"></div>`;
}

describe("toggleTitle", () => {
  test("inserts the title after the comic image", () => {
    renderComic("a hover joke");
    toggleTitle();

    const titleEl = document.getElementById("xkcd-toolbar-title");
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe("a hover joke");
    expect(titleEl.previousElementSibling.tagName).toBe("IMG");
  });

  test("removes the title on a second call", () => {
    renderComic("a hover joke");
    toggleTitle();
    toggleTitle();

    expect(document.getElementById("xkcd-toolbar-title")).toBeNull();
  });

  test("does nothing when there is no comic image", () => {
    document.body.innerHTML = "";
    toggleTitle();

    expect(document.getElementById("xkcd-toolbar-title")).toBeNull();
  });
});
