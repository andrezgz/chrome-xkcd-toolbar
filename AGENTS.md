# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```sh
npm install       # install devDependencies (eslint, jest, jest-environment-jsdom)
npm run lint      # eslint . (also lints JSON files via jsonc-eslint-parser)
npm test          # run the full jest suite
npx jest test/createPanel.test.js   # run a single test file
npx jest -t "wires the title button" # run tests matching a name
```

No build step. To try the extension itself: open `chrome://extensions`, enable Developer mode, "Load unpacked", select this folder.

## Workflow expectations

- Add tests for new logic where practical (pure functions and observable DOM/message behavior). This is a small extension — don't chase exotic edge cases, but don't skip coverage either.
- When a change adds/changes a user-facing feature or a dev-facing workflow (new npm script, new shortcut, etc.), update `README.md` accordingly, and bump `manifest.json`'s `version`/`description` (and `package.json`'s `version` to match) for user-facing changes.

## Architecture

Two independent scripts, wired together only through `chrome.runtime` messaging — there is no build/bundle step, both are loaded as-is per `manifest.json`.

- **`content.js`** — a single IIFE injected into `xkcd.com`/`www.xkcd.com` pages. Runs `init()` immediately on load, which checks `isXkcdComicPage()`, resolves the current comic number, then builds the floating panel and installs the keyboard shortcuts.
- **`background.js`** — the service worker. Listens for a `"download-comic"` message from the content script and calls `chrome.downloads.download`, inferring the file extension from the image URL.

### Comic-number resolution

`comicNumber()` has two sources, because xkcd's root URL (`/`) shows the latest comic with no number in the URL:

1. `parseComicNumber(location.pathname)` — parses `/NNNN/` from the URL.
2. `permalinkComicNumber()` — falls back to reading `#middleContainer`'s "Permanent link to this comic: https://xkcd.com/NNNN" anchor from the DOM. This only triggers on the root page.

`isXkcdComicUrl` accordingly matches both `/NNNN/` and the bare root path.

### Pure-core / thin-wrapper pattern

Functions that touch global state (`location`, `document`) are split into a pure core (takes the value as an argument, easy to unit test) plus a thin wrapper (reads the global and calls the core): `isXkcdComicUrl(href)` / `isXkcdComicPage()`, `parseComicNumber(pathname)` / `comicNumber()`, `extractTitle(img)` / `comicTitle()`, `extractComicName(heading, img)` / `comicName()`. Follow this pattern for new logic that needs `location` or `document` — it's what makes the logic testable without fighting jsdom.

### Comic name vs. hover text

Two different strings are easy to confuse. The **comic name** (e.g. "Python") is the `#ctitle` heading, with the `<img>`'s `alt` as fallback — `comicName()` returns it and only the download filename uses it. The **hover text** is the `<img>`'s `title` attribute (the joke) — the `T` toggle shows it, and it's what `extractTitle()`/`comicTitle()` return despite their names.

### Panel construction

`createPanel(n)` rebuilds the whole floating toolbar from scratch each time (removes any existing `#xkcd-toolbar-panel` first). It's assembled from three reusable builders — reuse these for new controls instead of raw `document.createElement` calls:

- `createSeparator()` — the `|` between items
- `createToolbarLink({ href, title, text, external })`
- `createToolbarButton({ title, ariaLabel, text, onClick })`

### Keyboard shortcuts

`installKeyboardNavigation()` attaches exactly one `keydown` listener on `document`, guarded by `window.__xkcdToolbarKeyHandler` so repeated calls are no-ops. The listener first bails on modifier keys and on typing contexts (`input`/`textarea`/`select`/`contentEditable`), then dispatches on `event.key` in a `switch`. New shortcuts go in that `switch`, and should generally get a matching button in `createPanel` with the key noted in its `title` (e.g. `"Go to comic (G)"`).

### Test-only export hook

At the bottom of the IIFE, a guarded block (`typeof module !== "undefined" && module.exports`) exports internals for Jest. This branch never runs in the real browser (`module` is undefined there). Any new function that needs direct unit testing must be added to this export list.

## Testing notes (jsdom-specific gotchas)

- Tests `require("../content.js")` / `require("../background.js")` directly (CommonJS) and rely on the export hook above.
- To control `location` for a test file, use a docblock at the top: `@jest-environment jsdom` + `@jest-environment-options {"url": "https://xkcd.com/353/"}`. This is file-scoped, not per-test.
- **`location.assign`/`location.href` cannot be reliably mocked** in this jsdom setup (the property is non-configurable) — don't `jest.spyOn(window.location, ...)`. As a result, the `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard tests don't assert the exact navigated-to URL; only `E`/`D`/`T`/`G` and the guard behaviors (modifier keys, input fields, single-install) are asserted for `installKeyboardNavigation`. `window.open` and `window.prompt` spy normally since they're plain `window` methods, not the special `Location` object.
- `test/setupJest.js` (wired via `jest.config.js`'s `setupFilesAfterEnv`) resets the `chrome.*` mocks, clears `document.body`/`document.head`, and calls `jest.resetModules()` before every test. Do not add logic there that deletes `window.__xkcdToolbarKeyHandler` between tests within a file — `content.js`'s own `init()` already installs a listener at `require()` time on comic-page URLs, and clearing the flag mid-file lets a second listener attach, causing handlers to double-fire. Each test *file* already gets an isolated `window` from Jest, so no manual reset is needed across files.
