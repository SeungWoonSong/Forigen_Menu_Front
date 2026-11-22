import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import postcss from "postcss";

const css = postcss.parse(readFileSync("src/app/globals.css", "utf8"));

function palette(selector: string) {
  const tokens = new Map<string, string>();
  css.walkRules(selector, rule => {
    rule.walkDecls(/^--/, declaration => {
      tokens.set(declaration.prop, declaration.value);
    });
  });
  return tokens;
}

function luminance(hsl: string | undefined) {
  const match = hsl?.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  assert.ok(match, `Expected an HSL color token, got ${hsl}`);
  const [hue, saturation, lightness] = [Number(match[1]), Number(match[2]) / 100, Number(match[3]) / 100];
  const amplitude = saturation * Math.min(lightness, 1 - lightness);
  const [red, green, blue] = [0, 8, 4].map(offset => {
    const sector = (offset + hue / 30) % 12;
    const channel = lightness - amplitude * Math.max(-1, Math.min(sector - 3, 9 - sector, 1));
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

const light = palette(":root");
const dark = new Map([...light, ...palette(".dark")]);
const foregrounds = ["--foreground", "--muted-foreground", "--menu-accent-foreground"];
const surfaces = ["--background", "--card", "--muted"];
const pairs = [
  ...foregrounds.flatMap(foreground => surfaces.map(surface => [foreground, surface])),
  ["--menu-accent-foreground", "--menu-accent"],
];

for (const [theme, tokens] of [["light", light], ["dark", dark]] as const) {
  for (const [foreground, surface] of pairs) {
    test(`${theme} ${foreground} on ${surface} meets 4.5:1 contrast`, () => {
      const text = luminance(tokens.get(foreground));
      const background = luminance(tokens.get(surface));
      const ratio = (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
      assert.ok(ratio >= 4.5, `Measured contrast is ${ratio.toFixed(2)}:1`);
    });
  }
}
