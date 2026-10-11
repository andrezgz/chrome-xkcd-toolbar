describe("background message listener", () => {
  const sender = { id: "test-extension-id" };

  function loadListener() {
    require("../background.js");
    return chrome.runtime.onMessage.addListener.mock.calls[0][0];
  }

  test("downloads the comic with the extension inferred from the URL", () => {
    const listener = loadListener();

    listener(
      {
        type: "download-comic",
        url: "https://imgs.xkcd.com/comics/a_title.png",
        filename: "xkcd-353-a-title"
      },
      sender
    );

    expect(chrome.downloads.download).toHaveBeenCalledWith({
      url: "https://imgs.xkcd.com/comics/a_title.png",
      filename: "xkcd-353-a-title.png",
      saveAs: false,
      conflictAction: "uniquify"
    });
  });

  test("keeps jpg and gif extensions", () => {
    const listener = loadListener();

    listener(
      {
        type: "download-comic",
        url: "https://imgs.xkcd.com/comics/photo.jpg?x=1",
        filename: "xkcd-2-photo"
      },
      sender
    );
    listener(
      {
        type: "download-comic",
        url: "https://imgs.xkcd.com/comics/anim.gif",
        filename: "xkcd-3-anim"
      },
      sender
    );

    expect(chrome.downloads.download).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ filename: "xkcd-2-photo.jpg" })
    );
    expect(chrome.downloads.download).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ filename: "xkcd-3-anim.gif" })
    );
  });

  test("defaults to png when the URL has no extension", () => {
    const listener = loadListener();

    listener(
      {
        type: "download-comic",
        url: "https://imgs.xkcd.com/comics/mystery",
        filename: "xkcd-1-mystery"
      },
      sender
    );

    expect(chrome.downloads.download).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "xkcd-1-mystery.png" })
    );
  });

  test("defaults to png when the extension is not an image type", () => {
    const listener = loadListener();

    listener(
      {
        type: "download-comic",
        url: "https://imgs.xkcd.com/comics/payload.exe",
        filename: "xkcd-1-payload"
      },
      sender
    );

    expect(chrome.downloads.download).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "xkcd-1-payload.png" })
    );
  });

  test("ignores messages of other types", () => {
    const listener = loadListener();

    listener({ type: "something-else" }, sender);

    expect(chrome.downloads.download).not.toHaveBeenCalled();
  });

  test("ignores messages from other senders", () => {
    const listener = loadListener();

    listener(
      {
        type: "download-comic",
        url: "https://imgs.xkcd.com/comics/a_title.png",
        filename: "xkcd-353-a-title"
      },
      { id: "some-other-extension" }
    );

    expect(chrome.downloads.download).not.toHaveBeenCalled();
  });

  test.each([
    ["a non-xkcd host", "https://evil.example.com/comics/a.png"],
    ["a lookalike host", "https://imgs.xkcd.com.evil.example/a.png"],
    ["the plain http scheme", "http://imgs.xkcd.com/comics/a.png"],
    ["a data URL", "data:image/png;base64,AAAA"],
    ["a file URL", "file:///etc/passwd"],
    ["a malformed URL", "not a url"],
    ["a missing URL", undefined]
  ])("rejects %s", (_label, url) => {
    const listener = loadListener();

    listener(
      { type: "download-comic", url, filename: "xkcd-1-a" },
      sender
    );

    expect(chrome.downloads.download).not.toHaveBeenCalled();
  });

  test.each([
    ["a path traversal", "../../evil"],
    ["a subdirectory", "xkcd-1-a/b"],
    ["an arbitrary name", "setup"],
    ["a missing name", undefined]
  ])("rejects a filename with %s", (_label, filename) => {
    const listener = loadListener();

    listener(
      {
        type: "download-comic",
        url: "https://imgs.xkcd.com/comics/a.png",
        filename
      },
      sender
    );

    expect(chrome.downloads.download).not.toHaveBeenCalled();
  });
});
