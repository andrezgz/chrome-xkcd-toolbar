/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://xkcd.com/353/"}
 */
const { createPanel } = require("../content.js");

describe("createPanel", () => {
  test("renders navigation links relative to the comic number", () => {
    createPanel(353);

    const panel = document.getElementById("xkcd-toolbar-panel");
    expect(panel).not.toBeNull();
    expect(panel.getAttribute("role")).toBe("toolbar");

    const links = panel.querySelectorAll("a");
    expect(links[0].href).toBe("https://xkcd.com/352/");
    expect(links[1].href).toBe("https://xkcd.com/354/");
    expect(links[2].href).toBe("https://www.explainxkcd.com/wiki/index.php/353");
    expect(links[2].target).toBe("_blank");
    expect(links[2].rel).toBe("noopener");

    const numberBadge = panel.querySelector(".xkcd-number");
    expect(numberBadge.textContent).toBe("#353");
    expect(numberBadge.tagName).toBe("BUTTON");
  });

  test("clamps the previous link at comic 1", () => {
    createPanel(1);

    const links = document.getElementById("xkcd-toolbar-panel").querySelectorAll("a");
    expect(links[0].href).toBe("https://xkcd.com/1/");
  });

  test("replaces an existing panel instead of duplicating it", () => {
    createPanel(1);
    createPanel(2);

    expect(document.querySelectorAll("#xkcd-toolbar-panel")).toHaveLength(1);
    expect(document.querySelector(".xkcd-number").textContent).toBe("#2");
  });

  test("wires the title button to toggleTitle", () => {
    document.body.innerHTML = '<div id="comic"><img src="/x.png" title="joke"></div>';
    createPanel(353);

    document.querySelector("button[aria-label='Toggle comic title']").click();

    expect(document.getElementById("xkcd-toolbar-title")).not.toBeNull();
  });

  test("wires the download button to downloadComic", () => {
    document.body.innerHTML = '<div id="comic"><img src="/x.png" title="joke"></div>';
    createPanel(353);

    document.querySelector("button[aria-label='Download comic image']").click();

    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });
});
