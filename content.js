(() => {
  "use strict";

  const PANEL_ID = "xkcd-toolbar-panel";
  const STYLE_ID = "xkcd-toolbar-style";
  const TITLE_ID = "xkcd-toolbar-title";
  const TITLE_BUTTON_CLASS = "xkcd-title-button";
  const PIN_TITLE_KEY = "pinTitle";
  const KEY_HANDLER_FLAG = "__xkcdToolbarKeyHandler";
  const IMPORT_ID = "xkcd-toolbar-import";
  const SEEN_KEY = "seenRanges";
  const FAVORITES_KEY = "favorites";
  const NAV_MODE_KEY = "xkcdNavMode";
  const NAV_MODES = ["favorites", "unread"];

  const READ_STATES = {
    new: { icon: "👀", title: "First visit: click to mark as unread (U)" },
    seen: { icon: "✓", title: "Read: click to mark as unread (U)" },
    unread: { icon: "✗", title: "Marked as unread: click to mark as read (U)" }
  };

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
      const response = await fetch(`${location.origin}/${n}/`);
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

  function prefetchComics(numbers) {
    return Promise.all(numbers.map(prefetchComic));
  }

  function prefetchAdjacentComics(n) {
    return prefetchComics(adjacentComicNumbers(n));
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

  // Comic sets (read comics, favorites) are stored as compact range strings
  // such as "1-117,160-190,200" to stay well under the chrome.storage.sync
  // per-item limit.
  function mergeRanges(ranges) {
    const sorted = ranges
      .map(([a, b]) => [Math.min(a, b), Math.max(a, b)])
      .sort((x, y) => x[0] - y[0]);

    const merged = [];
    for (const [a, b] of sorted) {
      const last = merged[merged.length - 1];
      if (last && a <= last[1] + 1) {
        last[1] = Math.max(last[1], b);
      } else {
        merged.push([a, b]);
      }
    }
    return merged;
  }

  // One range per line: "a..b", "a-b" or a single number, both ends included.
  // Anything after the numbers on a line is ignored.
  function parseRangeList(text) {
    const ranges = [];
    const invalid = [];

    for (const raw of String(text ?? "").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;

      const match = line.match(/^(\d+)(?:\s*(?:\.\.|-)\s*(\d+))?/);
      const start = match ? Number(match[1]) : 0;
      const end = match?.[2] === undefined ? start : Number(match[2]);
      if (start < 1 || end < 1) {
        invalid.push(line);
        continue;
      }

      ranges.push([start, end]);
    }

    return { ranges: mergeRanges(ranges), invalid };
  }

  function encodeRanges(ranges) {
    return ranges.map(([a, b]) => (a === b ? String(a) : `${a}-${b}`)).join(",");
  }

  function decodeRanges(encoded) {
    return parseRangeList(String(encoded ?? "").split(",").join("\n")).ranges;
  }

  function rangesToSet(ranges) {
    const set = new Set();
    for (const [a, b] of ranges) {
      for (let n = a; n <= b; n++) set.add(n);
    }
    return set;
  }

  function setToRanges(set) {
    return mergeRanges([...set].map(n => [n, n]));
  }

  function countInRanges(ranges) {
    return ranges.reduce((total, [a, b]) => total + (b - a + 1), 0);
  }

  // Closest favorite before (direction -1) or after (direction 1) n; n itself
  // does not need to be a favorite.
  function favoriteNeighbor(favorites, n, direction) {
    let best = null;
    for (const m of favorites) {
      const closer = direction > 0 ? m > n && (best === null || m < best) : m < n && (best === null || m > best);
      if (closer) best = m;
    }
    return best;
  }

  // Closest comic before/after n that is not in `seen`. `latest` (when known)
  // stops the search from running past the newest comic.
  function unreadNeighbor(seen, n, direction, latest = null) {
    for (let m = n + direction; m >= 1 && (latest === null || m <= latest); m += direction) {
      if (!seen.has(m)) return m;
    }
    return null;
  }

  let seenComics = new Set();
  let favoriteComics = new Set();
  let latestComic = null;
  let currentComic = null;
  // "new" | "seen" | "unread"; stays null until chrome.storage has loaded.
  let readStatus = null;

  // The navigation mode lives in sessionStorage: per tab, gone when it closes.
  function currentNavMode() {
    try {
      const mode = sessionStorage.getItem(NAV_MODE_KEY);
      return NAV_MODES.includes(mode) ? mode : null;
    } catch {
      return null;
    }
  }

  function setNavMode(mode) {
    try {
      if (mode) {
        sessionStorage.setItem(NAV_MODE_KEY, mode);
      } else {
        sessionStorage.removeItem(NAV_MODE_KEY);
      }
    } catch {
      // Without sessionStorage the mode just lasts until the next navigation.
    }
  }

  // Comic that ← / → (and the Prev/Next links) lead to from n, or null when
  // the active navigation mode has nothing further in that direction.
  function navigationTarget(n, direction) {
    const mode = currentNavMode();
    if (mode === "favorites") return favoriteNeighbor(favoriteComics, n, direction);
    if (mode === "unread") return unreadNeighbor(seenComics, n, direction, latestComic);

    return direction < 0 ? Math.max(1, n - 1) : n + 1;
  }

  // Writes go through a queue and re-read the stored set right before applying
  // `mutate`, so a tab (or another device) that was open with an older copy
  // cannot wipe what others recorded in the meantime.
  let pendingWrite = Promise.resolve();

  function updateComicSet(key, mutate) {
    pendingWrite = pendingWrite.then(async () => {
      try {
        const stored = await chrome.storage.sync.get({ [key]: "" });
        const set = rangesToSet(decodeRanges(stored[key]));
        mutate(set);
        await chrome.storage.sync.set({ [key]: encodeRanges(setToRanges(set)) });
      } catch {
        // Storage unavailable: tracking just won't persist.
      }
    });
    return pendingWrite;
  }

  // Picks up changes made by other tabs or devices.
  function watchStoredSets() {
    if (!chrome.storage.onChanged) return;

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || (!changes[SEEN_KEY] && !changes[FAVORITES_KEY])) return;

      if (changes[SEEN_KEY]) seenComics = rangesToSet(decodeRanges(changes[SEEN_KEY].newValue));
      if (changes[FAVORITES_KEY]) {
        favoriteComics = rangesToSet(decodeRanges(changes[FAVORITES_KEY].newValue));
      }
      if (currentComic !== null) createPanel(currentComic);
    });
  }

  // Comics already handed to the prefetcher, so toggling modes back and forth
  // does not pile up duplicate preload hints.
  const prefetchedComics = new Set();

  // Warms the comics ← / → lead to under the active navigation mode.
  function prefetchNavigationTargets(n) {
    const targets = [navigationTarget(n, -1), navigationTarget(n, 1)].filter(
      m => m !== null && m !== n && !prefetchedComics.has(m)
    );
    targets.forEach(m => prefetchedComics.add(m));
    return prefetchComics(targets);
  }

  async function loadLatestComic() {
    if (latestComic !== null) return;

    try {
      const response = await fetch(`${location.origin}/info.0.json`);
      if (!response.ok) return;

      const { num } = await response.json();
      if (!Number.isInteger(num)) return;
      latestComic = num;
    } catch {
      return;
    }

    if (currentComic !== null) createPanel(currentComic);
  }

  // Loads the read/favorite sets, records the current comic as visited (the
  // panel still shows 👀 for this first visit) and renders the tracking
  // controls.
  async function loadTrackingState(n) {
    currentComic = n;

    try {
      const stored = await chrome.storage.sync.get({ [SEEN_KEY]: "", [FAVORITES_KEY]: "" });
      seenComics = rangesToSet(decodeRanges(stored[SEEN_KEY]));
      favoriteComics = rangesToSet(decodeRanges(stored[FAVORITES_KEY]));
    } catch {
      // Storage unavailable: the toolbar still works, just without tracking.
      return;
    }

    if (seenComics.has(n)) {
      readStatus = "seen";
    } else {
      readStatus = "new";
      seenComics.add(n);
      updateComicSet(SEEN_KEY, set => set.add(n));
    }

    watchStoredSets();
    createPanel(n);

    if (currentNavMode()) prefetchNavigationTargets(n);
    if (currentNavMode() === "unread") loadLatestComic();
  }

  function toggleRead(n) {
    if (readStatus === null) return;

    if (readStatus === "unread") {
      seenComics.add(n);
      readStatus = "seen";
      updateComicSet(SEEN_KEY, set => set.add(n));
    } else {
      seenComics.delete(n);
      readStatus = "unread";
      updateComicSet(SEEN_KEY, set => set.delete(n));
    }
    createPanel(n);
  }

  function toggleFavorite(n) {
    if (readStatus === null) return;

    if (favoriteComics.has(n)) {
      favoriteComics.delete(n);
      updateComicSet(FAVORITES_KEY, set => set.delete(n));
    } else {
      favoriteComics.add(n);
      updateComicSet(FAVORITES_KEY, set => set.add(n));
    }
    createPanel(n);
  }

  function toggleNavMode(mode) {
    setNavMode(currentNavMode() === mode ? null : mode);
    if (currentComic !== null) createPanel(currentComic);
    if (currentNavMode() && currentComic !== null) prefetchNavigationTargets(currentComic);
    if (currentNavMode() === "unread") loadLatestComic();
  }

  function clearNavMode() {
    if (!currentNavMode()) return;

    setNavMode(null);
    if (currentComic !== null) createPanel(currentComic);
  }

  // Replaces the read history with exactly the given ranges.
  function importReadRanges(ranges) {
    seenComics = rangesToSet(ranges);
    updateComicSet(SEEN_KEY, set => {
      set.clear();
      seenComics.forEach(n => set.add(n));
    });
    readStatus = seenComics.has(currentComic) ? "seen" : "unread";
    if (currentComic !== null) createPanel(currentComic);
  }

  function closeImportDialog() {
    document.getElementById(IMPORT_ID)?.remove();
  }

  function openImportDialog() {
    if (!document.body || document.getElementById(IMPORT_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = IMPORT_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Import read comics");

    const box = document.createElement("div");

    const heading = document.createElement("strong");
    heading.textContent = "Import read comics";

    const help = document.createElement("p");
    help.textContent =
      "One range per line, both ends included (1-117, 160..190, or a single number). ";

    const warning = document.createElement("strong");
    warning.className = "xkcd-import-warning";
    warning.textContent = "This replaces your whole read history.";
    help.appendChild(warning);

    const textarea = document.createElement("textarea");
    textarea.rows = 8;
    textarea.placeholder = "1-117\n160..190";

    const summary = document.createElement("p");

    const importButton = createToolbarButton({
      title: "Replace the read history with these ranges",
      ariaLabel: "Import",
      text: "Import",
      onClick: () => {
        const { ranges, invalid } = parseRangeList(textarea.value);
        if (invalid.length || !ranges.length) return;

        importReadRanges(ranges);
        closeImportDialog();
      }
    });

    const cancelButton = createToolbarButton({
      title: "Close without importing (Esc)",
      ariaLabel: "Cancel",
      text: "Cancel",
      onClick: closeImportDialog
    });

    const refresh = () => {
      const { ranges, invalid } = parseRangeList(textarea.value);
      importButton.disabled = invalid.length > 0 || ranges.length === 0;

      if (invalid.length) {
        summary.textContent = `Unrecognized line: ${invalid[0]}`;
      } else if (!ranges.length) {
        summary.textContent = "Nothing to import yet.";
      } else {
        summary.textContent = `${countInRanges(ranges)} comics in ${ranges.length} range(s) will be marked as read; all others as unread.`;
      }
    };

    textarea.addEventListener("input", refresh);
    // Typing contexts are ignored by the global key handler, so Esc is local.
    textarea.addEventListener("keydown", event => {
      if (event.key === "Escape") closeImportDialog();
    });
    refresh();

    [heading, help, textarea, summary, importButton, cancelButton].forEach(node => box.appendChild(node));
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    textarea.focus();
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

      #${IMPORT_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,.45);
      }

      #${IMPORT_ID} > div {
        width: min(420px, 90vw);
        padding: 14px 16px;
        background: #fff;
        color: #000;
        border: 2px solid #000;
        font: 14px/1.4 Lucida, Helvetica, sans-serif;
      }

      #${IMPORT_ID} .xkcd-import-warning {
        color: #c00;
      }

      #${IMPORT_ID} textarea {
        width: 100%;
        box-sizing: border-box;
        font: 13px monospace;
      }

      #${IMPORT_ID} button {
        margin-right: 12px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #000;
        font: inherit;
        text-decoration: underline;
        cursor: pointer;
      }

      #${IMPORT_ID} button:disabled {
        color: #999;
        cursor: default;
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

    // Inside a navigation mode with nothing further, the link stays put.
    const previous = navigationTarget(n, -1) ?? n;
    const next = navigationTarget(n, 1) ?? n;

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

    // The mode buttons change where Prev/Next lead, so they come first; the
    // read icon and the favorite star describe the current comic, so they sit
    // right next to its number. None are rendered until the stored sets have
    // loaded.
    const statusControls = [];
    const modeControls = [];

    if (readStatus !== null) {
      const state = READ_STATES[readStatus];
      const readButton = createToolbarButton({
        title: state.title,
        ariaLabel: "Toggle read state",
        text: state.icon,
        onClick: () => toggleRead(n)
      });
      readButton.className = "xkcd-read";

      const favorite = favoriteComics.has(n);
      const favoriteButton = createToolbarButton({
        title: favorite ? "Remove from favorites (F)" : "Add to favorites (F)",
        ariaLabel: "Toggle favorite",
        text: favorite ? "⭐" : "☆",
        onClick: () => toggleFavorite(n)
      });
      favoriteButton.className = "xkcd-favorite";

      const favoritesMode = createToolbarButton({
        title: "Favorites navigation: ← → jump between favorites (Shift+F)",
        ariaLabel: "Toggle favorites navigation",
        text: "Favs",
        onClick: () => toggleNavMode("favorites")
      });
      favoritesMode.className = "xkcd-mode-favorites";
      favoritesMode.setAttribute("aria-pressed", String(currentNavMode() === "favorites"));

      const unreadMode = createToolbarButton({
        title: "Unread navigation: ← → jump between unread comics (Shift+U)",
        ariaLabel: "Toggle unread navigation",
        text: "Unread",
        onClick: () => toggleNavMode("unread")
      });
      unreadMode.className = "xkcd-mode-unread";
      unreadMode.setAttribute("aria-pressed", String(currentNavMode() === "unread"));

      statusControls.push(readButton, favoriteButton);
      modeControls.push(favoritesMode, unreadMode, createSeparator());
    }

    [
      ...modeControls,
      previousLink,
      createSeparator(),
      numberBadge,
      ...statusControls,
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
        (event.shiftKey && !/^[tfui]$/i.test(event.key)) ||
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
        case "ArrowRight": {
          event.preventDefault();
          const destination = navigationTarget(n, event.key === "ArrowLeft" ? -1 : 1);
          if (destination !== null) go(`https://xkcd.com/${destination}/`);
          break;
        }

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

        // Caps Lock yields "F"/"U" without Shift: only Shift switches modes.
        case "f":
        case "F":
          event.preventDefault();
          if (event.shiftKey) {
            toggleNavMode("favorites");
          } else {
            toggleFavorite(n);
          }
          break;

        case "u":
        case "U":
          event.preventDefault();
          if (event.shiftKey) {
            toggleNavMode("unread");
          } else {
            toggleRead(n);
          }
          break;

        case "i":
        case "I":
          if (!event.shiftKey) break;
          event.preventDefault();
          openImportDialog();
          break;

        case "Escape":
          if (document.getElementById(IMPORT_ID)) {
            closeImportDialog();
          } else {
            clearNavMode();
          }
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
    loadTrackingState(n);
    // Inside a navigation mode the neighbours are prefetched once the stored
    // sets are loaded (loadTrackingState); n±1 would be wasted.
    if (!currentNavMode()) prefetchAdjacentComics(n);
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
      prefetchComics,
      prefetchNavigationTargets,
      parseRangeList,
      encodeRanges,
      decodeRanges,
      rangesToSet,
      setToRanges,
      favoriteNeighbor,
      unreadNeighbor,
      navigationTarget,
      loadTrackingState,
      toggleRead,
      toggleFavorite,
      toggleNavMode,
      importReadRanges,
      openImportDialog,
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
