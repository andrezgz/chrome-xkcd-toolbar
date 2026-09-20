chrome.runtime.onMessage.addListener((message, _sender) => {
  if (message?.type !== "download-comic") return;

  const extMatch = message.url.match(/\.(\w+)(?:[?#]|$)/);
  const ext = extMatch ? extMatch[1] : "png";

  chrome.downloads.download({
    url: message.url,
    filename: `${message.filename}.${ext}`,
    saveAs: false,
    conflictAction: "uniquify"
  });
});
