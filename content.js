(() => {
  "use strict";

  const PANEL_ID = "xkcd-toolbar-panel";
  const STYLE_ID = "xkcd-toolbar-style";
  const TITLE_ID = "xkcd-toolbar-title";
  const KEY_HANDLER_FLAG = "__xkcdToolbarKeyHandler";

  function isXkcdComicPage() {
    return /^https:\/\/(www\.)?xkcd\.com\/\d+\/?$/.test(location.href);
  }

  function comicNumber() {
    const match = location.pathname.match(/^\/(\d+)\/?$/);
    return match ? Number(match[1]) : null;
  }

  function comicImage() {
    // The main comic image is normally inside #comic.
    return document.querySelector("#comic img");
  }

  function comicTitle() {
    const img = comicImage();
    if (!img) return null;

    // XKCD stores the comic's title (the hover-text joke) in the title
    // attribute. Fall back to alt if it's ever missing.
    return (img.getAttribute("title") || img.getAttribute("alt") || "").trim();
  }

  function slugify(text) {
    return text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function downloadComic() {
    const n = comicNumber();
    const img = comicImage();

    if (n === null || !img) return;

    const title = comicTitle() || "comic";
    const slug = slugify(title) || "comic";
    const filename = `xkcd-${n}-${slug}`;

    chrome.runtime.sendMessage({
      type: "download-comic",
      url: img.currentSrc || img.src,
      filename
    });
  }

  function go(url) {
    location.href = url;
  }

  function toggleTitle() {
    const existing = document.getElementById(TITLE_ID);
    if (existing) {
      existing.remove();
      return;
    }

    const img = comicImage();
    const title = comicTitle();
    if (!img || !title) return;

    const titleEl = document.createElement("div");
    titleEl.id = TITLE_ID;
    titleEl.textContent = title;
    img.insertAdjacentElement("afterend", titleEl);
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 12px;
        background: #fff;
        color: #000;
        border: 2px solid #000;
        box-shadow: 2px 2px 8px rgba(0,0,0,.35);
        font: 14px/1.2 Arial, sans-serif;
      }

      #${PANEL_ID} a,
      #${PANEL_ID} button {
        color: #000;
        text-decoration: none;
        font: inherit;
      }

      #${PANEL_ID} a:hover,
      #${PANEL_ID} button:hover {
        text-decoration: underline;
      }

      #${PANEL_ID} button {
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
      }

      #${PANEL_ID} .xkcd-number {
        font-weight: bold;
      }

      #${PANEL_ID} .xkcd-separator {
        color: #777;
      }

      #${TITLE_ID} {
        margin-top: 10px;
        font: italic 14px/1.4 Arial, sans-serif;
        color: #333;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  function createSeparator() {
    const separator = document.createElement("span");
    separator.className = "xkcd-separator";
    separator.textContent = "|";
    return separator;
  }

  function createPanel(n) {
    document.getElementById(PANEL_ID)?.remove();

    if (!document.body) return;

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.setAttribute("role", "toolbar");
    panel.setAttribute("aria-label", "XKCD navigation toolbar");

    const previous = Math.max(1, n - 1);
    const next = n + 1;

    const previousLink = document.createElement("a");
    previousLink.href = `https://xkcd.com/${previous}/`;
    previousLink.title = "Previous comic (←)";
    previousLink.textContent = "← Previous";

    const numberBadge = document.createElement("span");
    numberBadge.className = "xkcd-number";
    numberBadge.textContent = `#${n}`;

    const nextLink = document.createElement("a");
    nextLink.href = `https://xkcd.com/${next}/`;
    nextLink.title = "Next comic (→)";
    nextLink.textContent = "Next →";

    const explainLink = document.createElement("a");
    explainLink.href = `https://www.explainxkcd.com/wiki/index.php/${n}`;
    explainLink.target = "_blank";
    explainLink.rel = "noopener";
    explainLink.title = "Explain XKCD (E)";
    explainLink.textContent = "Explain";

    const titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.title = "Toggle comic title (T)";
    titleButton.setAttribute("aria-label", "Toggle comic title");
    titleButton.textContent = "Title";
    titleButton.addEventListener("click", toggleTitle);

    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.title = "Download comic image (D)";
    downloadButton.setAttribute("aria-label", "Download comic image");
    downloadButton.textContent = "Download";
    downloadButton.addEventListener("click", downloadComic);

    [
      previousLink,
      createSeparator(),
      numberBadge,
      createSeparator(),
      nextLink,
      createSeparator(),
      explainLink,
      createSeparator(),
      titleButton,
      createSeparator(),
      downloadButton
    ].forEach(node => panel.appendChild(node));

    document.body.appendChild(panel);
  }

  function installKeyboardNavigation() {
    if (window[KEY_HANDLER_FLAG]) return;
    window[KEY_HANDLER_FLAG] = true;

    document.addEventListener("keydown", event => {
      const target = event.target;

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const n = comicNumber();
      if (n === null) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          go(`https://xkcd.com/${Math.max(1, n - 1)}/`);
          break;

        case "ArrowRight":
          event.preventDefault();
          go(`https://xkcd.com/${n + 1}/`);
          break;

        case "Home":
          event.preventDefault();
          go("https://xkcd.com/1/");
          break;

        case "End":
          event.preventDefault();
          go("https://xkcd.com/");
          break;

        case "e":
        case "E":
          event.preventDefault();
          window.open(
            `https://www.explainxkcd.com/wiki/index.php/${n}`,
            "_blank",
            "noopener"
          );
          break;

        case "d":
        case "D":
          event.preventDefault();
          downloadComic();
          break;

        case "t":
        case "T":
          event.preventDefault();
          toggleTitle();
          break;
      }
    });
  }

  function init() {
    if (!isXkcdComicPage()) return;

    const n = comicNumber();
    if (n === null) return;

    addStyles();
    createPanel(n);
    installKeyboardNavigation();
  }

  init();
})();
