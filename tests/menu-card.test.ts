import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MenuCard } from "../src/components/MenuCard";
import { menuCopy } from "../src/lib/menu-copy";
import type { Language, MenuInfo } from "../src/types/menu";
import { emptyMenu, mainDish } from "./menu-fixtures";

const spicySpeech = { ko: "앗 매워!", en: "So spicy!", zh: "好辣！", sv: "Oj, starkt!" };
const languages = Object.keys(spicySpeech) as Language[];
const spicyPenguin = /<img\b[^>]*%2Fpenguin%2Fspicy\.png[^>]*>/;

function renderDish(info: MenuInfo, language: Language = "en") {
  const menu = { ...emptyMenu("20261123", language), lunch: [{ ...mainDish, info }] };
  const markup = renderToStaticMarkup(createElement(MenuCard, { menu, language, dinnerFirst: false }));
  return markup.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)![1];
}

for (const language of languages) {
  test(`renders the ${language} speech bubble with the decorative hot penguin`, () => {
    const card = renderDish({ spice: 3 }, language);
    const images = [...card.matchAll(new RegExp(spicyPenguin, "g"))];
    assert.equal(images.length, 1);
    const [[image]] = images;
    const firstRow = card.slice(0, card.indexOf("</div></div>"));
    const group = firstRow.match(/<div aria-hidden="true"[^>]*>([\s\S]*)$/)?.[1];
    assert.ok(group);
    assert.match(image, /\balt=""/);
    assert.ok(group.endsWith(`>${spicySpeech[language]}</span>${image}`));
    const spiceTag = `>${menuCopy[language].spice[3]}</span>`;
    assert.equal(card.split(spiceTag).length, 2);
    assert.ok(card.slice(card.indexOf("<h4")).includes(spiceTag));
    assert.doesNotMatch(card, /<aside\b/);
  });
}

test("omits the hot penguin and speech bubble for spice levels zero through two", () => {
  for (const language of languages) {
    for (const spice of [0, 1, 2] as const) {
      const card = renderDish({ spice }, language);
      assert.doesNotMatch(card, spicyPenguin);
      assert.ok(!card.includes(`>${spicySpeech[language]}</span>`));
    }
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
