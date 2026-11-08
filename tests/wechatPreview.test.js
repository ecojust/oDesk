import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import themes from "../src/views/skillapps/WechatPublisherTemplate.js";
import {
  createPreviewDocument,
  findSelectedTheme,
  renderWechatArticle,
  themeIdentity,
} from "../src/service/wechatPreview.js";

const dom = new JSDOM("");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const parse = (html) => new JSDOM(html).window.document;
const markdown = `---
title: 不应出现在正文的元数据
description: 文章描述
---
# 示例文章

## 排版标题

正文 **强调** 与 [链接](https://example.com)。

> 引用内容

- 第一项
- 第二项

\`\`\`js
const value = 42;
\`\`\`

![图片](images/cover.jpg)
`;

test("every built-in template renders real inline styles from draft.md", async () => {
  const results = new Set();
  for (const theme of themes.filter((theme) => theme.buildIn)) {
    const result = await renderWechatArticle({
      markdown, html: "<p>过期 HTML</p>", theme,
    });
    const document = parse(result);
    assert.ok(document.querySelector("#wenyan")?.getAttribute("style"));
    assert.ok(document.querySelector("h2")?.getAttribute("style"));
    assert.ok(document.querySelector("blockquote"));
    assert.ok(document.querySelector("pre code"));
    assert.equal(document.querySelector("img")?.getAttribute("src"), "images/cover.jpg");
    assert.doesNotMatch(result, /不应出现在正文的元数据|过期 HTML/);
    results.add(result);
  }
  assert.equal(results.size, 8, "switching templates must change the rendered HTML");
});

test("custom CSS resolves variables and keeps the root background and heading decoration", async () => {
  const result = await renderWechatArticle({
    markdown,
    theme: { key: "forest" },
    themeCss: `:root { --text: #2d5a45; }
      #wenyan { background-color: #f0f7f4; color: var(--text); padding: 16px; }
      #wenyan h2 { border-left: 5px solid var(--text); }
      #wenyan h2::before { content: "◆"; color: var(--text); }
      @keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`,
  });
  const document = parse(result);
  assert.equal(document.querySelector("#wenyan").style.backgroundColor, "rgb(240, 247, 244)");
  assert.equal(document.querySelector("#wenyan").style.color, "rgb(45, 90, 69)");
  assert.equal(document.defaultView.getComputedStyle(document.querySelector("p")).color, "rgb(45, 90, 69)");
  assert.equal(document.querySelector("h2").style.borderLeftWidth, "5px");
  assert.match(document.querySelector("h2").textContent, /◆/);
});

test("dark templates keep light inherited paragraph text after WeChat postprocessing", async () => {
  const result = await renderWechatArticle({
    markdown: "# 标题\n\n正常段落\n\n- 列表文字",
    theme: { key: "arcade" },
    themeCss: `:root { --text-main: #fff; --comic-bg: #0a0a1a; }
      #wenyan { color: var(--text-main); background-color: var(--comic-bg); font-family: 'Courier New', monospace; }
      #wenyan h1 { color: #ff0080; }
      #wenyan p { margin: 1em 0; }`,
  });
  const document = parse(result);
  const style = (selector) => document.defaultView.getComputedStyle(document.querySelector(selector));
  assert.equal(style("#wenyan").backgroundColor, "rgb(10, 10, 26)");
  assert.equal(style("p").color, "rgb(255, 255, 255)");
  assert.equal(style("li").color, "rgb(255, 255, 255)");
  assert.equal(style("h1").color, "rgb(255, 0, 128)");
  assert.match(style("#wenyan").fontFamily, /Courier New/);
});

const legacyPostitCss = readFileSync(new URL("./fixtures/postit-legacy.css", import.meta.url), "utf8");

test("existing postit workspaces place the message icon at the upper left in preview and publication HTML", async () => {
  const html = await renderWechatArticle({
    markdown: "> 便利贴引用内容",
    theme: { key: "postit" },
    themeCss: legacyPostitCss,
  });
  const document = parse(html);
  const quote = document.querySelector("blockquote");
  const icon = quote.querySelector("section");
  assert.equal(quote.style.position, "relative");
  assert.equal(icon.textContent, "💬");
  assert.equal(icon.style.position, "absolute");
  assert.equal(icon.style.top, "-15px");
  assert.equal(icon.style.left, "10px");
  assert.equal(icon.style.right, "");
  assert.equal(parse(createPreviewDocument(html)).querySelector("#wenyan").outerHTML, html);
});

test("postit correction preserves customized styles and never changes other themes", async () => {
  for (const [key, css] of [
    ["postit", legacyPostitCss.replace("right: 10px", "right: 24px")],
    ["postit", legacyPostitCss.replace("--comic-bg: #fffe91", "--comic-bg: #ffffee")],
    ["another-theme", legacyPostitCss],
  ]) {
    const html = await renderWechatArticle({ markdown: "> 引用", theme: { key }, themeCss: css });
    const icon = parse(html).querySelector("blockquote > section");
    assert.equal(icon.style.left, "");
    assert.equal(icon.style.right, css.includes("right: 24px") ? "24px" : "10px");
  }
});

test("updated postit CSS keeps the left icon without duplicating its decoration", async () => {
  const html = await renderWechatArticle({
    markdown: "> 引用",
    theme: { key: "postit" },
    themeCss: legacyPostitCss.replace("right: 10px", "left: 10px"),
  });
  const quote = parse(html).querySelector("blockquote");
  assert.equal(quote.querySelectorAll("section").length, 1);
  assert.equal(quote.querySelector("section").style.left, "10px");
});

test("HTML-only drafts can be restyled without retaining stale inline styles", async () => {
  const result = await renderWechatArticle({
    html: '<section id="wenyan" style="background:red"><h2 style="color:red">原有正文</h2></section>',
    theme: { key: "lapis", buildIn: true },
  });
  const document = parse(result);
  assert.equal(document.querySelectorAll("#wenyan").length, 1);
  assert.equal(document.querySelector("h2").textContent, "原有正文");
  assert.notEqual(document.querySelector("h2").style.color, "red");
  assert.notEqual(document.querySelector("#wenyan").style.background, "red");
});

test("built-in and custom purple retain their existing persisted configuration identities", () => {
  const builtIn = findSelectedTheme(themes, { wenyanTheme: "purple", wenyanCustomCss: false });
  const custom = findSelectedTheme(themes, { wenyanTheme: "purple", wenyanCustomCss: true });
  assert.equal(builtIn.buildIn, true);
  assert.equal(custom.file, "style-purple");
  assert.notEqual(themeIdentity(builtIn), themeIdentity(custom));
  assert.equal(new Set(themes.map(themeIdentity)).size, themes.length);
});

test("missing custom styles or unknown themes fail visibly instead of showing an incorrect template", async () => {
  await assert.rejects(renderWechatArticle({ markdown, theme: { key: "forest" } }), /样式缺失/);
  await assert.rejects(renderWechatArticle({ markdown }), /模板不存在/);
  assert.equal(await renderWechatArticle({ theme: { key: "default", buildIn: true } }), "");
});

test("article HTML cannot carry scripts or active event handlers into the preview or publication", async () => {
  const result = await renderWechatArticle({
    markdown: '<script>alert(1)</script>\n\n<img src="images/a.jpg" onerror="alert(1)">\n\n<a href="javascript:alert(1)">链接</a>',
    theme: { key: "default", buildIn: true },
  });
  assert.doesNotMatch(result, /<script|onerror=|javascript:/);
});

test("preview document isolates typography and resolves relative workspace images", () => {
  const html = '<section id="wenyan"><p>正文</p></section>';
  const document = parse(createPreviewDocument(html, 'http://asset.localhost/workspace/draft.md?x="'));
  assert.equal(document.querySelector("base").getAttribute("href"), 'http://asset.localhost/workspace/draft.md?x="');
  assert.match(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content, /default-src 'none'/);
  assert.equal(document.querySelector("#wenyan").outerHTML, html);
});
