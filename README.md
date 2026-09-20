# XKCD Toolbar

Chrome extension for xkcd.com.

## Features

- Automatically runs on XKCD comic pages
- Previous / Next navigation
- Left / Right arrow keyboard navigation
- Home -> XKCD #1
- End -> latest XKCD
- E -> open the Explain XKCD page
- D -> download the comic image with format `xkcd-NUMBER-COMIC-TITLE.png`
- T -> toggle the comic's hover-text title below the image

## Install

1. Extract this ZIP.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `xkcd-toolbar` folder.

No build step or dependencies are required.

## Keys

- Left Arrow: previous comic
- Right Arrow: next comic
- Home: first comic
- End: latest comic
- E: Explain XKCD
- D: Download comic
- T: Toggle comic title

## Development

```sh
npm install
npm run lint
npm test
```
