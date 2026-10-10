# XKCD Toolbar

Unofficial Chrome toolbar for xkcd.com: browse with your keyboard, jump to any comic, toggle the hover text, open Explain XKCD, and download the image with a clean filename. No build step, no dependencies.

## Features

- Automatically runs on XKCD comic pages
- Previous / Next navigation
- Toggle the comic's hover text (the image's title attribute) below the image
- Open the Explain XKCD page
- Download the comic image with format `xkcd-NUMBER-COMIC-NAME.EXT`
- Jump to any comic number (click the comic number in the panel, or press G)

### Keyboard shortcuts

- Left Arrow: previous comic
- Right Arrow: next comic
- Home: first comic
- End: latest comic
- T: Toggle comic title
- E: Explain XKCD
- D: Download comic
- G: Go to comic number

## Install

1. Clone this repository (or download it as a ZIP from GitHub and extract it):

   ```sh
   git clone https://github.com/andrezgz/chrome-xkcd-toolbar.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the cloned folder (the one containing `manifest.json`).
6. Visit any comic on [xkcd.com](https://xkcd.com) and the toolbar will appear.

No build step or dependencies are required. After pulling changes, click the
reload icon on the extension's card in `chrome://extensions`.

## Development

```sh
npm install
npm run lint
npm test
```

## Disclaimer

This is an unofficial extension and is not affiliated with, endorsed by, or
sponsored by xkcd or Randall Munroe. xkcd comics are licensed by their author
under [CC BY-NC 2.5](https://xkcd.com/license.html).

## License

[MIT](LICENSE)
