import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { makeArticleCanvasTransparent } from "../src/service/wechatContrast.js";

const article = (style, content) => {
  const root = new JSDOM(`<section id="wenyan" style="${style}">${content}</section>`).window.document.querySelector("section");
  // Apply declarations through CSSOM as Wenyan does: jsdom's cssText parser
  // currently drops some declarations following a background shorthand.
  for (const node of [root, ...root.querySelectorAll("[style]")]) {
    const declarations = node.getAttribute("style").split(";");
    node.removeAttribute("style");
    for (const declaration of declarations) {
      const separator = declaration.indexOf(":");
      if (separator < 0) continue;
      const property = declaration.slice(0, separator).trim();
      const value = declaration.slice(separator + 1).trim();
      node.style.setProperty(property, value.replace(/\s*!important$/, ""), value.endsWith("!important") ? "important" : "");
    }
  }
  return root;
};

test("removes every canvas background while preserving local decoration", () => {
  const root = article("background: rgb(238, 238, 238) !important; background-image: linear-gradient(rgb(238, 238, 238), rgb(255, 255, 255)); background-size: 20px 20px; padding: 16px; color: rgb(34, 51, 68);", '<h2 style="background:rgb(255, 255, 0);border:2px solid red">Title</h2><p>Text</p>');
  const heading = root.querySelector("h2").getAttribute("style");
  makeArticleCanvasTransparent(root);
  assert.equal(root.style.backgroundColor, "transparent");
  assert.ok(!root.style.backgroundImage || root.style.backgroundImage === "none");
  assert.notEqual(root.style.backgroundSize, "20px 20px");
  assert.equal(root.style.padding, "16px");
  assert.equal(root.style.color, "rgb(34, 51, 68)");
  assert.equal(root.querySelector("h2").getAttribute("style"), heading);
});

test("makes inherited light text readable without changing dark local cards", () => {
  const root = article("background:rgb(17, 17, 17);color:rgb(255, 255, 255)", '<p>Body</p><blockquote style="background:rgb(34, 34, 34)"><p>Quote</p></blockquote><pre style="background:rgb(5, 5, 16)"><code style="color:rgb(0, 255, 255)">Code</code></pre>');
  makeArticleCanvasTransparent(root);
  assert.notEqual(root.style.color, "rgb(255, 255, 255)");
  assert.equal(root.querySelector("p").style.color, "");
  assert.equal(root.querySelector("blockquote").style.color, "rgb(255, 255, 255)", "an inherited local-card color must be pinned when its parent changes");
  assert.equal(root.querySelector("blockquote p").style.color, "");
  assert.equal(root.querySelector("pre").style.backgroundColor, "rgb(5, 5, 16)");
  assert.equal(root.querySelector("code").style.color, "rgb(0, 255, 255)");
});

test("adapts explicit white text over transparent and translucent surfaces", () => {
  const root = article("background:rgb(10, 10, 26);color:rgb(255, 255, 255)", '<h1 style="color:white;background:transparent">Title</h1><blockquote style="color:rgb(255, 255, 255);background:linear-gradient(135deg,rgba(255,0,128,.1),rgba(0,255,255,.1))"><p>Quote</p></blockquote>');
  const gradient = root.querySelector("blockquote").style.backgroundImage;
  makeArticleCanvasTransparent(root);
  assert.notEqual(root.querySelector("h1").style.color, "white");
  assert.notEqual(root.querySelector("h1").style.color, "rgb(255, 255, 255)");
  assert.notEqual(root.querySelector("blockquote").style.color, "rgb(255, 255, 255)");
  assert.equal(root.querySelector("blockquote").style.backgroundImage, gradient);
});

test("preserves readable theme colors and colors on opaque gradients", () => {
  const root = article("background:rgb(240, 247, 244);color:rgb(45, 90, 69)", '<h2 style="color:rgb(50, 101, 71)">Title</h2><section style="background:linear-gradient(rgb(17, 34, 51),rgb(34, 51, 68));color:white">Card</section>');
  const initial = [root.style.color, root.querySelector("h2").style.color, root.querySelector("section").style.color];
  makeArticleCanvasTransparent(root);
  assert.deepEqual([root.style.color, root.querySelector("h2").style.color, root.querySelector("section").style.color], initial);
});

test("unknown image backgrounds preserve their original inherited text", () => {
  const root = article("background:rgb(17, 17, 17);color:white", '<section style="background-image:url(cover.jpg)"><p>Image caption</p></section>');
  makeArticleCanvasTransparent(root);
  assert.notEqual(root.style.color, "white");
  assert.equal(root.querySelector("section").style.color, "rgb(255, 255, 255)");
  assert.equal(root.querySelector("section").style.backgroundImage, 'url("cover.jpg")');
});

test("root without an explicit color still loses its canvas background", () => {
  const root = article("background:linear-gradient(rgb(102, 126, 234),rgb(118, 75, 162))", "<p>Text</p>");
  makeArticleCanvasTransparent(root);
  assert.equal(root.style.backgroundColor, "transparent");
  assert.ok(!root.style.backgroundImage || root.style.backgroundImage === "none");
});

test("gradient-only canvases with initial background color still adapt white text", () => {
  const root = article("color:white;background-image:linear-gradient(135deg,rgb(102,126,234),rgb(118,75,162));background-color:initial", "<p>Text</p>");
  makeArticleCanvasTransparent(root);
  assert.equal(root.style.backgroundColor, "transparent");
  assert.notEqual(root.style.color, "white");
  assert.notEqual(root.style.color, "rgb(255, 255, 255)");
});
