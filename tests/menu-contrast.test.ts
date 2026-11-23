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

function colorValue(tokens: Map<string, string>, name: string, visited = new Set<string>()): string {
  assert.ok(!visited.has(name), `Circular color token alias: ${name}`);
  const value = tokens.get(name);
  assert.ok(value, `Missing color token: ${name}`);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (!alias) return value;
  visited.add(name);
  return colorValue(tokens, alias[1], visited);
}

function luminance(hsl: string) {
  const match = hsl.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
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
const foregrounds = ["--foreground", "--menu-accent-foreground"];
const surfaces = ["--background", "--card", "--muted"];
const pairs = [
  ...foregrounds.flatMap(foreground => surfaces.map(surface => [foreground, surface])),
  ["--muted-foreground", "--card", "hot penguin caption"],
  ["--muted-foreground", "--background"],
  ["--muted-foreground", "--muted"],
  ["--menu-accent-foreground", "--menu-accent"],
  ["--foreground", "--menu-speech"],
  ["--secondary-foreground", "--muted"],
];

for (const [theme, tokens] of [["light", light], ["dark", dark]] as const) {
  for (const [foreground, surface, label = `${foreground} on ${surface}`] of pairs) {
    test(`${theme} ${label} meets 4.5:1 contrast`, () => {
      const text = luminance(colorValue(tokens, foreground));
      const background = luminance(colorValue(tokens, surface));
      const ratio = (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
      assert.ok(ratio >= 4.5, `Measured contrast is ${ratio.toFixed(2)}:1`);
    });
  }
}
