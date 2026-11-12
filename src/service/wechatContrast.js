import { generate, parse } from "css-tree";

const WHITE = [255, 255, 255, 1];
const BLACK = [0, 0, 0, 1];
const CLEAR = [0, 0, 0, 0];

// Wenyan emits inline RGB/hex colors. Unsupported custom color syntax is kept
// intact instead of guessing its appearance.
const readColor = (value = "") => {
  value = value.trim().toLowerCase();
  if (value === "transparent" || !value) return CLEAR;
  if (value === "white") return WHITE;
  if (value === "black") return BLACK;
  const hex = value.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/);
  if (hex) {
    const digits = hex[1].length < 5 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16))
      .concat(digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1);
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (!rgb) return null;
  const parts = rgb[1].trim().split(/[\s,/]+/);
  if (parts.length < 3 || parts.length > 4 || parts.some((part) => !/^\d*\.?\d+%?$/.test(part))) return null;
  return parts.slice(0, 3).map((part) => Math.min(255, parseFloat(part) * (part.endsWith("%") ? 2.55 : 1)))
    .concat(parts[3] ? Math.min(1, parseFloat(parts[3]) / (parts[3].endsWith("%") ? 100 : 1)) : 1);
};

const over = (foreground, background) => foreground.slice(0, 3)
  .map((channel, index) => channel * foreground[3] + background[index] * (1 - foreground[3])).concat(1);

// Sampling gradient stops is sufficient for the bundled translucent theme
// decorations. URLs, unresolved variables and unknown stops remain untouched.
const gradientLayers = (value) => {
  if (!value || value === "none") return [];
  try {
    const layers = [];
    for (const node of parse(value, { context: "value" }).children) {
      if (node.type === "Operator" && node.value === ",") continue;
      if (node.type !== "Function" || !/^(repeating-)?(linear|radial|conic)-gradient$/.test(node.name)) return null;
      const argumentsList = [[]];
      node.children.forEach((part) => {
        if (part.type === "Operator" && part.value === ",") argumentsList.push([]);
        else argumentsList.at(-1).push(part);
      });
      const colors = [];
      for (const [index, argument] of argumentsList.entries()) {
        const first = argument[0];
        const color = first && readColor(generate(first));
        if (color) colors.push(color);
        else if (index !== 0 || !/^(to\b|at\b|circle\b|ellipse\b|closest-|farthest-|[+-]?[\d.]+(?:deg|rad|grad|turn)\b)/.test(argument.map((part) => generate(part)).join(" "))) return null;
      }
      if (colors.length < 2) return null;
      layers.push(colors);
    }
    return layers;
  } catch {
    return null;
  }
};

const paint = (style, inherited) => {
  const color = /^(initial|unset|revert)?$/i.test(style.backgroundColor) ? CLEAR : readColor(style.backgroundColor);
  const layers = gradientLayers(/^(initial|unset|revert)$/i.test(style.backgroundImage) ? "none" : style.backgroundImage);
  if (!inherited || !color || !layers) return null;
  let samples = inherited.map((background) => over(color, background));
  for (const layer of layers.reverse()) {
    if (samples.length * layer.length > 64) return null;
    samples = layer.flatMap((stop) => samples.map((background) => over(stop, background)));
  }
  return samples;
};

const luminance = (color) => color.slice(0, 3).reduce((sum, channel, index) => {
  const value = channel / 255;
  return sum + [0.2126, 0.7152, 0.0722][index] * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
}, 0);

const contrast = (color, backgrounds) => Math.min(...backgrounds.map((background) => {
  const foregroundLight = luminance(over(color, background));
  const backgroundLight = luminance(background);
  return (Math.max(foregroundLight, backgroundLight) + 0.05) / (Math.min(foregroundLight, backgroundLight) + 0.05);
}));

const readableColor = (color, before, after) => {
  if (!color || !before || !after || color[3] === 0) return color;
  const current = contrast(color, after);
  // Avoid recoloring themes whose contrast was not harmed by canvas removal.
  if (current >= 4.5 || current >= contrast(color, before) - 0.1) return color;
  const target = contrast(BLACK, after) >= contrast(WHITE, after) ? BLACK : WHITE;
  const mix = (amount) => color.slice(0, 3).map((channel, i) => Math.round(channel + (target[i] - channel) * amount)).concat(color[3]);
  if (contrast(mix(1), after) < 4.6) return color;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 16; i++) {
    const amount = (low + high) / 2;
    if (contrast(mix(amount), after) >= 4.6) high = amount;
    else low = amount;
  }
  return mix(high);
};

const equalColor = (first, second) => first && second && first.every((value, index) => value === second[index]);
const cssColor = (color) => `rgba(${color.slice(0, 3).join(", ")}, ${color[3]})`;

/** Remove only the article canvas; preserve local backgrounds and their text. */
export function makeArticleCanvasTransparent(root) {
  const visit = (node, inheritedColor, inheritedNewColor, oldBackground, newBackground) => {
    const ownColor = node.style.color;
    const inheritsColor = !ownColor || /^(inherit|unset|currentcolor)$/i.test(ownColor);
    const originalColor = inheritsColor ? inheritedColor : readColor(ownColor);
    const oldSurface = paint(node.style, oldBackground);
    const newSurface = node === root ? [WHITE] : paint(node.style, newBackground);
    const newColor = readableColor(originalColor, oldSurface, newSurface);
    if (newColor && !equalColor(newColor, inheritsColor ? inheritedNewColor : originalColor)) {
      node.style.setProperty("color", cssColor(newColor), node.style.getPropertyPriority("color"));
      if (node === root) node.style.caretColor = cssColor(newColor);
    }
    for (const child of node.children) {
      // SVGs keep their own drawing colors; article text is ordinary HTML.
      if (child.namespaceURI === "http://www.w3.org/1999/xhtml") {
        visit(child, originalColor, newColor, oldSurface, newSurface);
      }
    }
  };
  visit(root, [34, 34, 34, 1], [34, 34, 34, 1], [WHITE], [WHITE]);
  for (const property of Array.from(root.style)) {
    if (property === "background" || property.startsWith("background-")) root.style.removeProperty(property);
  }
  root.style.background = "transparent";
}
