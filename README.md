# XKCD Toolbar

Chrome extension for xkcd.com.

## Features

- Automatically runs on XKCD comic pages
- Previous / Next navigation
- Toggle the comic's hover-text title below the image
- Open the Explain XKCD page
- Download the comic image with format `xkcd-NUMBER-COMIC-TITLE.EXT`

### Keyboard shortcuts

- Left Arrow: previous comic
- Right Arrow: next comic
- Home: first comic
- End: latest comic
- T: Toggle comic title
- E: Explain XKCD
- D: Download comic

## Install

1. Extract this ZIP.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `xkcd-toolbar` folder.

No build step or dependencies are required.

## Development

```sh
npm install
npm run lint
npm test
```
