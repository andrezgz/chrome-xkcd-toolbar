/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
const { downloadComic } = require("../content.js");

function renderComic(src, { name, hoverText } = {}) {
  const heading = name ? `<div id="ctitle">${name}</div>` : "";
  const alt = name ? ` alt="${name}"` : "";
  const title = hoverText ? ` title="${hoverText}"` : "";
  document.body.innerHTML = `${heading}<div id="comic"><img src="${src}"${alt}${title}></div>`;
}

describe("downloadComic", () => {
  test("sends a download-comic message with a slugified filename", () => {
    renderComic("https://imgs.xkcd.com/comics/a_title.png", { name: "A Title" });

    downloadComic();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "download-comic",
      url: "https://imgs.xkcd.com/comics/a_title.png",
      filename: "xkcd-353-a-title"
    });
  });

  test("names the file after the comic title, not the hover text", () => {
    renderComic("https://imgs.xkcd.com/comics/python.png", {
      name: "Python",
      hoverText: "I wrote 20 short programs in Python yesterday."
    });

    downloadComic();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "xkcd-353-python" })
    );
  });

  test('falls back to "comic" when there is no comic title', () => {
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
