import createDOMPurify from "dompurify";
import { generate, parse, walk } from "css-tree";
import { makeArticleCanvasTransparent } from "./wechatContrast.js";

let corePromise;
let styleCorePromise;
const rootColors = new Map();

// Load the same renderer used by Wenyan CLI only when an article is opened.
const getCore = () => {
  corePromise ||= import("@wenyan-md/core").then(({ createWenyanCore }) =>
    createWenyanCore({ isWechat: true }),
  );
  return corePromise;
};

const getRootColor = async (theme, themeCss, document) => {
  const key = theme.buildIn ? `builtin:${theme.key}` : themeCss;
  if (!rootColors.has(key)) {
    const colorPromise = (async () => {
      styleCorePromise ||= import("@wenyan-md/core").then(({ createWenyanCore }) =>
        createWenyanCore({ isWechat: false, isConvertMathJax: false }),
      );
      const core = await styleCorePromise;
      // Only style an empty root, not a second copy of the article. This keeps
      // Wenyan's variable resolution and font defaults consistent with CLI.
      const root = document.createElement("section");
      root.id = "wenyan";
      await core.applyStylesWithTheme(root, {
        themeId: theme.buildIn ? theme.key : "default",
        themeCss,
        isMacStyle: false,
        isAddFootnote: false,
      });
      return root.style.color;
    })();
    rootColors.set(key, colorPromise);
    colorPromise.catch(() => rootColors.delete(key));
  }
  return rootColors.get(key);
};

export const themeIdentity = (theme) =>
  `${theme.buildIn ? "builtin" : "custom"}:${theme.key}`;

export const findSelectedTheme = (themes, config) =>
  themes.find(
    (theme) => theme.key === config.wenyanTheme &&
      !theme.buildIn === !!config.wenyanCustomCss,
  );

// Existing workspaces retain their installed skill CSS across app updates.
// Only migrate the exact shipped postit theme, preserving user customizations.
const LEGACY_POSTIT_CSS_SHA256 = "ceec4a1ba71841b77a52c9158bf7910c061552da51822e8686b013a971f2ca47";

const publicationCss = async (css, theme) => {
  const ast = parse(css);
  if (theme.key === "postit") {
    if (!globalThis.crypto?.subtle) {
      throw new Error("当前环境不支持模板兼容校验，无法渲染便利贴模板");
    }
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode(generate(ast)),
    );
    const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (fingerprint === LEGACY_POSTIT_CSS_SHA256) {
      walk(ast, {
        visit: "Rule",
        enter(node) {
          if (generate(node.prelude) !== "#wenyan blockquote::before") return;
          node.block.children.forEach((declaration) => {
            if (declaration.type === "Declaration" && declaration.property === "right") {
              declaration.property = "left";
            }
          });
        },
      });
    }
  }
  // Keyframe percentages are not DOM selectors. Wenyan's inline-style
  // renderer cannot apply animations; keep the theme's static appearance.
  walk(ast, {
    visit: "Atrule",
    enter(node, item, list) {
      if (/keyframes$/i.test(node.name) && list) list.remove(item);
    },
  });
  return generate(ast);
};

/** Produces the actual inline-styled publication HTML, not a preview-only skin. */
export async function renderWechatArticle({ markdown = "", html = "", theme, themeCss }) {
  if (!markdown.trim() && !html.trim()) return "";
  if (!theme) throw new Error("所选排版模板不存在，请重新选择模板");
  if (!theme.buildIn && !themeCss?.trim()) {
    throw new Error("排版模板样式缺失，请重置微信发布器技能后重试");
  }

  const core = await getCore();
  const sanitizer = createDOMPurify(window);
  const document = window.document.implementation.createHTMLDocument("");
  const article = document.createElement("section");
  article.id = "wenyan";

  if (markdown.trim()) {
    const { content } = await core.handleFrontMatter(markdown);
    article.innerHTML = sanitizer.sanitize(await core.renderMarkdown(content));
  } else {
    // Older workspaces may contain only draft.html. Remove the old template's
    // inline styles before applying the new one, and avoid nesting #wenyan.
    const source = document.createElement("div");
    source.innerHTML = sanitizer.sanitize(html);
    source.querySelectorAll("style, link").forEach((node) => node.remove());
    source.querySelectorAll("[style]").forEach((node) => node.removeAttribute("style"));
    article.innerHTML = (source.querySelector("#wenyan") || source).innerHTML;
  }

  const resolvedCss = theme.buildIn ? undefined : await publicationCss(themeCss, theme);
  const rootColor = await getRootColor(theme, resolvedCss, document);
  const rendered = await core.applyStylesWithTheme(article, {
    themeId: theme.buildIn ? theme.key : "default",
    themeCss: resolvedCss,
  });
  // Recover the original theme foreground before adapting it to the
  // transparent canvas; Wenyan's WeChat postprocessor forces it to black.
  const result = document.createElement("div");
  result.innerHTML = rendered;
  const root = result.querySelector("#wenyan");
  if (rootColor) {
    root.style.color = rootColor;
    root.style.caretColor = rootColor;
  }
  makeArticleCanvasTransparent(root);
  return root.outerHTML;
}

const escapeAttribute = (value) => value.replace(/[&"<>]/g, (char) =>
  ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[char],
);

export function createPreviewDocument(html, baseUrl = "") {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: asset: data:; style-src 'unsafe-inline';">
${baseUrl ? `<base href="${escapeAttribute(baseUrl)}">` : ""}
<style>html{background:transparent;color:#222}body{background:transparent;margin:0;padding:20px;overflow-wrap:break-word}img,svg{max-width:100%}#wenyan{box-sizing:border-box;max-width:100%}</style>
</head><body>${html}</body></html>`;
}
