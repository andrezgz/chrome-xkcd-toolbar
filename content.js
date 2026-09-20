(() => {
  "use strict";

  const PANEL_ID = "xkcd-toolbar-panel";
  const STYLE_ID = "xkcd-toolbar-style";
  const TITLE_ID = "xkcd-toolbar-title";
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

  function extractTitle(img) {
    if (!img) return null;

    // XKCD stores the comic's title (the hover-text joke) in the title
    // attribute. Fall back to alt if it's ever missing.
    return (img.getAttribute("title") || img.getAttribute("alt") || "").trim();
  }

  function comicTitle() {
    return extractTitle(comicImage());
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
      text: "← Previous"
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
      text: "Next →"
    });

    const explainLink = createToolbarLink({
      href: `https://www.explainxkcd.com/wiki/index.php/${n}`,
      title: "Explain XKCD (E)",
      text: "Explain",
      external: true
    });

    const titleButton = createToolbarButton({
      title: "Toggle comic title (T)",
      ariaLabel: "Toggle comic title",
      text: "Title",
      onClick: toggleTitle
    });

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
      slugify,
      downloadComic,
      parseTargetComicNumber,
      goToComic,
      toggleTitle,
      createPanel,
      installKeyboardNavigation,
      init
    };
  }

  init();
})();
