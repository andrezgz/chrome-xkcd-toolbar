(() => {
  "use strict";

  const PANEL_ID = "xkcd-toolbar-panel";
  const STYLE_ID = "xkcd-toolbar-style";
  const TITLE_ID = "xkcd-toolbar-title";
  const TITLE_BUTTON_CLASS = "xkcd-title-button";
  const PIN_TITLE_KEY = "pinTitle";
  const KEY_HANDLER_FLAG = "__xkcdToolbarKeyHandler";

  function isXkcdComicUrl(href) {
    // The root path also counts: xkcd serves the latest comic there.
    return /^https:\/\/(www\.)?xkcd\.com\/(\d+\/?)?$/.test(href);
  }

  function isXkcdComicPage() {
    return isXkcdComicUrl(location.href);
  }

  function parseComicNumber(pathname) {
    const match = pathname.match(/^\/(\d+)\/?$/);
    return match ? Number(match[1]) : null;
  }

  function permalinkComicNumber() {
    // The root path has no comic number in the URL, but xkcd always prints
    // a permanent link to the current comic inside #middleContainer.
    const link = document.querySelector('#middleContainer a[href^="https://xkcd.com/"]');
    if (!link) return null;

    const match = link.getAttribute("href").match(/\/(\d+)\/?$/);
    return match ? Number(match[1]) : null;
  }

  function comicNumber() {
    return parseComicNumber(location.pathname) ?? permalinkComicNumber();
  }

  function comicImage() {
    // The main comic image is normally inside #comic.
    return document.querySelector("#comic img");
  }

  // Not to be confused with the comic's name (see extractComicName): the
  // image's title attribute holds the hover-text joke.
  function extractTitle(img) {
    if (!img) return null;

    return (img.getAttribute("title") || "").trim();
  }

  function comicTitle() {
    return extractTitle(comicImage());
  }

  // The comic's name (e.g. "Python") is the #ctitle heading above the comic;
  // the image's alt attribute repeats it and serves as a fallback. Never the
  // image's title attribute, which is the hover text.
  function extractComicName(heading, img) {
    const fromHeading = (heading?.textContent || "").trim();
    if (fromHeading) return fromHeading;

    return (img?.getAttribute("alt") || "").trim();
  }

  function comicName() {
    return extractComicName(document.getElementById("ctitle"), comicImage());
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

    const slug = slugify(comicName()) || "comic";
    const filename = `xkcd-${n}-${slug}`;

    chrome.runtime.sendMessage({
      type: "download-comic",
      url: img.currentSrc || img.src,
      filename
    });
  }

  // Previous and next comic numbers worth prefetching: comic 1 has no
  // previous one.
  function adjacentComicNumbers(n) {
    return [n - 1, n + 1].filter(m => m >= 1);
  }

  // Reads the comic image's src/srcset out of a fetched comic page.
  function extractComicImageSource(doc) {
    const img = doc.querySelector("#comic img");
    const src = img?.getAttribute("src");
    if (!src) return null;

    return { src, srcset: img.getAttribute("srcset") };
  }

  // Warms the HTTP cache with a native preload hint. Reusing the page's own
  // src/srcset lets the browser pick the same 1x/2x candidate it will request
  // on navigation.
  function preloadComicImage({ src, srcset }) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.setAttribute("as", "image");
    link.href = src;
    if (srcset) link.setAttribute("imagesrcset", srcset);
    document.head.appendChild(link);
    return link;
  }

  async function prefetchComic(n) {
    try {
      const response = await fetch(`https://xkcd.com/${n}/`);
      // The page after the latest comic does not exist.
      if (!response.ok) return;

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const source = extractComicImageSource(doc);
      if (source) preloadComicImage(source);
    } catch {
      // Prefetching is only an optimization: ignore any failure.
    }
  }

  function prefetchAdjacentComics(n) {
    return Promise.all(adjacentComicNumbers(n).map(prefetchComic));
  }

  function go(url) {
    location.assign(url);
  }

  function parseTargetComicNumber(input) {
    if (input === null) return null;

    const trimmed = input.trim();
    if (!/^\d+$/.test(trimmed)) return null;

    return Math.max(1, Number(trimmed));
  }

  function goToComic() {
    const n = parseTargetComicNumber(window.prompt("Go to comic #:"));
    if (n === null) return;

    go(`https://xkcd.com/${n}/`);
  }

  function showTitle() {
    if (document.getElementById(TITLE_ID)) return;

    const img = comicImage();
    const title = comicTitle();
    if (!img || !title) return;

    const titleEl = document.createElement("div");
    titleEl.id = TITLE_ID;
    titleEl.textContent = title;
    img.insertAdjacentElement("afterend", titleEl);
  }

  function toggleTitle() {
    const existing = document.getElementById(TITLE_ID);
    if (existing) {
      existing.remove();
      return;
    }

    showTitle();
  }

  // Whether the hover text is shown automatically on every comic. Persisted
  // in chrome.storage.sync so it survives navigation and syncs across devices.
  let titlePinned = false;

  function renderPinState() {
    const button = document.querySelector(`#${PANEL_ID} .${TITLE_BUTTON_CLASS}`);
    button?.setAttribute("aria-pressed", String(titlePinned));
  }

  async function loadTitlePinned() {
    try {
      const stored = await chrome.storage.sync.get({ [PIN_TITLE_KEY]: false });
      titlePinned = stored[PIN_TITLE_KEY] === true;
    } catch {
      // Storage unavailable: the toolbar still works, just without the pin.
      return;
    }
    renderPinState();
    if (titlePinned) showTitle();
  }

  function toggleTitlePinned() {
    titlePinned = !titlePinned;
    chrome.storage.sync.set({ [PIN_TITLE_KEY]: titlePinned });
    renderPinState();
    if (titlePinned) showTitle();
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

      #${PANEL_ID} button[aria-pressed="true"] {
        background: #ffe680;
        box-shadow: 0 0 0 3px #ffe680;
      }

      #${TITLE_ID} {
        margin-top: 10px;
        font: italic 14px/1.4 Lucida, Helvetica, sans-serif;
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

  function createToolbarLink({ href, title, text, external = false }) {
    const link = document.createElement("a");
    link.href = href;
    link.title = title;
    link.textContent = text;
    if (external) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    return link;
  }

  function createToolbarButton({ title, ariaLabel, text, onClick }) {
    const button = document.createElement("button");
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", ariaLabel);
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
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

    const previousLink = createToolbarLink({
      href: `https://xkcd.com/${previous}/`,
      title: "Previous comic (←)",
      text: "Prev"
    });

    const numberBadge = createToolbarButton({
      title: "Go to comic (G)",
      ariaLabel: "Go to comic number",
      text: `#${n}`,
      onClick: goToComic
    });
    numberBadge.className = "xkcd-number";

    const nextLink = createToolbarLink({
      href: `https://xkcd.com/${next}/`,
      title: "Next comic (→)",
      text: "Next"
    });

    const explainLink = createToolbarLink({
      href: `https://www.explainxkcd.com/wiki/index.php/${n}`,
      title: "Explain XKCD (E)",
      text: "Explain",
      external: true
    });

    const titleButton = createToolbarButton({
      title: "Toggle comic title (T), always show it (Shift+T)",
      ariaLabel: "Toggle comic title",
      text: "Title",
      onClick: toggleTitle
    });
    titleButton.className = TITLE_BUTTON_CLASS;
    titleButton.setAttribute("aria-pressed", String(titlePinned));

    const downloadButton = createToolbarButton({
      title: "Download comic image (D)",
      ariaLabel: "Download comic image",
      text: "Download",
      onClick: downloadComic
    });

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
        (event.shiftKey && event.key !== "T") ||
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
          event.preventDefault();
          toggleTitle();
          break;

        case "T":
          event.preventDefault();
          // Caps Lock yields "T" without Shift: keep it as a plain toggle.
          if (event.shiftKey) {
            toggleTitlePinned();
          } else {
            toggleTitle();
          }
          break;

        case "g":
        case "G":
          event.preventDefault();
          goToComic();
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
    loadTitlePinned();
    prefetchAdjacentComics(n);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      isXkcdComicUrl,
      isXkcdComicPage,
      parseComicNumber,
      permalinkComicNumber,
      comicNumber,
      comicImage,
      extractTitle,
      comicTitle,
      extractComicName,
      comicName,
      slugify,
      downloadComic,
      adjacentComicNumbers,
      extractComicImageSource,
      preloadComicImage,
      prefetchAdjacentComics,
      parseTargetComicNumber,
      goToComic,
      toggleTitle,
      loadTitlePinned,
      toggleTitlePinned,
      createPanel,
      installKeyboardNavigation,
      init
    };
  }

  init();
})();
