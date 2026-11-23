import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MenuCard } from "../src/components/MenuCard";
import { menuCopy } from "../src/lib/menu-copy";
import type { MenuInfo } from "../src/types/menu";
import { emptyMenu, mainDish } from "./menu-fixtures";

const spicyPenguin = /<img\b[^>]*%2Fpenguin%2Fspicy\.png[^>]*>/g;

function renderDish(info: MenuInfo) {
  const menu = { ...emptyMenu("20261123"), lunch: [{ ...mainDish, info }] };
  const markup = renderToStaticMarkup(createElement(MenuCard, { menu, language: "en", dinnerFirst: false }));
  return markup.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)![1];
}

test("renders one decorative hot penguin in the first row and no standalone tip", () => {
  const card = renderDish({ spice: 3 });
  const images = card.match(spicyPenguin) ?? [];
  assert.equal(images.length, 1);
  assert.ok(card.slice(0, card.indexOf("</div>")).includes(images[0]));
  assert.match(images[0], /\balt=""/);
  assert.match(images[0], /\baria-hidden="true"/);
  assert.match(images[0], /\bwidth="44"/);
  assert.match(images[0], /\bheight="44"/);
  assert.ok(card.includes(`>${menuCopy.en.spice[3]}</span>`));
  assert.doesNotMatch(card, /<aside\b/);
});

test("omits the hot penguin for spice levels zero through two", () => {
  for (const spice of [0, 1, 2] as const) {
    assert.doesNotMatch(renderDish({ spice }), spicyPenguin);
  }
});

test("keeps the mascot for similar food and howtoeat for serving tips on hot dishes", () => {
  const { similar_to, how_to_eat } = mainDish.info!;
  const card = renderDish({ spice: 3, similar_to, how_to_eat });
  const tips = card.match(/<aside\b[^>]*>([\s\S]*?)<\/aside>/)![1].split(/(?=<img\b)/).slice(1);
  assert.equal(tips.length, 2);
  assert.match(tips[0], /%2Fmascot\.png/);
  assert.ok(tips[0].includes(similar_to!));
  assert.match(tips[1], /%2Fpenguin%2Fhowtoeat\.png/);
  assert.ok(tips[1].includes(how_to_eat!));
  const servingTip = renderDish({ spice: 3, how_to_eat }).match(/<aside\b[^>]*>([\s\S]*?)<\/aside>/)![1];
  assert.ok(servingTip.includes(how_to_eat!));
  assert.doesNotMatch(servingTip, />Hot</);
});
