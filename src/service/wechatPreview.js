import createDOMPurify from "dompurify";
import { generate, parse, walk } from "css-tree";

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

const publicationCss = (css) => {
  const ast = parse(css);
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

  const resolvedCss = theme.buildIn ? undefined : publicationCss(themeCss);
  const rootColor = await getRootColor(theme, resolvedCss, document);
  const rendered = await core.applyStylesWithTheme(article, {
    themeId: theme.buildIn ? theme.key : "default",
    themeCss: resolvedCss,
  });
  // Wenyan's WeChat postprocessor forces the root to black. Restore the
  // template's own color so dark themes retain readable inherited body text.
  if (!rootColor) return rendered;
  const result = document.createElement("div");
  result.innerHTML = rendered;
  const root = result.querySelector("#wenyan");
  root.style.color = rootColor;
  root.style.caretColor = rootColor;
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
<style>html{background:#fff;color:#222}body{margin:0;padding:20px;overflow-wrap:break-word}img,svg{max-width:100%}#wenyan{box-sizing:border-box;max-width:100%}</style>
</head><body>${html}</body></html>`;
}
