describe("background message listener", () => {
  test("downloads the comic with the extension inferred from the URL", () => {
    require("../background.js");
    const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];

    listener({
      type: "download-comic",
      url: "https://imgs.xkcd.com/comics/a_title.png",
      filename: "xkcd-353-a-title"
    });

    expect(chrome.downloads.download).toHaveBeenCalledWith({
      url: "https://imgs.xkcd.com/comics/a_title.png",
      filename: "xkcd-353-a-title.png",
      saveAs: false,
      conflictAction: "uniquify"
    });
  });

  test("defaults to png when the URL has no extension", () => {
    require("../background.js");
    const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];

    listener({
      type: "download-comic",
      url: "https://imgs.xkcd.com/comics/mystery",
      filename: "xkcd-1-mystery"
    });

    expect(chrome.downloads.download).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "xkcd-1-mystery.png" })
    );
  });

  test("ignores messages of other types", () => {
    require("../background.js");
    const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];

    listener({ type: "something-else" });

    expect(chrome.downloads.download).not.toHaveBeenCalled();
  });
});
