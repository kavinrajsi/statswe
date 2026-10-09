// Brand colour helpers. Pure functions, usable on the server and in the browser.
// The colour is always checked and normalised to "#rrggbb" before it reaches any CSS.

const LIGHT_BG = "#ffffff";
const DARK_BG = "#0a0a0a";
const MIN_CONTRAST = 3;

// "#abc" or "#AABBCC" -> "#aabbcc". Anything else -> null.
export function normalizeHex(value) {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(v);
  if (short) return `#${[...short[1]].map((c) => c + c).join("")}`;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  return null;
}

function rgb(hex) {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

function toHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

// WCAG relative luminance
export function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(hex, target, t) {
  const from = rgb(hex);
  const to = rgb(target);
  return toHex(from.map((c, i) => c + (to[i] - c) * t));
}

// Moves the colour toward `target` (black or white) until it clears MIN_CONTRAST on `background`.
function fitContrast(hex, background, target) {
  for (let t = 0; t <= 1; t += 0.02) {
    const candidate = mix(hex, target, t);
    if (contrastRatio(candidate, background) >= MIN_CONTRAST) return candidate;
  }
  return target;
}

function rotateHue(hex, degrees) {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360 + degrees) % 360;
  }
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r2, g2, b2] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector];
  return toHex([(r2 + m) * 255, (g2 + m) * 255, (b2 + m) * 255]);
}

function foregroundFor(hex) {
  return contrastRatio("#000000", hex) >= contrastRatio("#ffffff", hex) ? "#000000" : "#ffffff";
}

// CSS that overrides the theme for the brand colour, in light and dark mode. Returns "" when no colour is set.
export function brandCss(color) {
  const hex = normalizeHex(color);
  if (!hex) return "";

  const companion = rotateHue(hex, 60); // second chart colour, so followers and non-followers still differ
  const vars = (primary) =>
    `--primary: ${primary}; --primary-foreground: ${foregroundFor(primary)}; --ring: ${primary}; ` +
    `--chart-1: ${hex}; --chart-2: ${companion};`;

  return `:root { ${vars(fitContrast(hex, LIGHT_BG, "#000000"))} } .dark { ${vars(fitContrast(hex, DARK_BG, "#ffffff"))} }`;
}
