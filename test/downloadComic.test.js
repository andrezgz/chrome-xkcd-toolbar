/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
const { downloadComic } = require("../content.js");

function renderComic(src, title) {
  document.body.innerHTML = `<div id="comic"><img src="${src}"${title ? ` title="${title}"` : ""}></div>`;
}

describe("downloadComic", () => {
  test("sends a download-comic message with a slugified filename", () => {
    renderComic("https://imgs.xkcd.com/comics/a_title.png", "A Title");

    downloadComic();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "download-comic",
      url: "https://imgs.xkcd.com/comics/a_title.png",
      filename: "xkcd-353-a-title"
    });
  });

  test('falls back to "comic" when there is no title', () => {
    renderComic("https://imgs.xkcd.com/comics/x.png");

    downloadComic();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "xkcd-353-comic" })
    );
  });

  test("does nothing when there is no comic image", () => {
    document.body.innerHTML = "";

    downloadComic();

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });
});
