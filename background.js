const COMIC_IMAGE_HOST = "imgs.xkcd.com";
const FILENAME_PATTERN = /^xkcd-\d+-[a-z0-9-]*$/;
const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif)$/i;

// The URL comes from the page DOM, so only fetch images from xkcd's image host.
function parseComicImageUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.hostname !== COMIC_IMAGE_HOST) return null;
    return url;
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender?.id !== chrome.runtime.id) return;
  if (message?.type !== "download-comic") return;

  const url = parseComicImageUrl(message.url);
  if (!url) return;
  if (typeof message.filename !== "string" || !FILENAME_PATTERN.test(message.filename)) return;

  const ext = url.pathname.match(IMAGE_EXTENSION_PATTERN)?.[1].toLowerCase() ?? "png";

  chrome.downloads.download({
    url: url.href,
    filename: `${message.filename}.${ext}`,
    saveAs: false,
    conflictAction: "uniquify"
  });
});
