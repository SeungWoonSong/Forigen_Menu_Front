import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cornerLabel, dateInKorea, displayOriginalName, extraMenuChips, extraMenuMeal, initialMenuDates, isStaple,
  menuState, menuWeekDates, pickDefaultDate, selectLanguage, sideItems, timeInKorea,
} from "../src/lib/menu";
import type { MenuRequest } from "../src/lib/menu";
import { normalizeDayMenu } from "../src/services/menuService";
import { emptyMenu, mainDish, malformedMenu, richMenu } from "./menu-fixtures";

const ready = (menu: ReturnType<typeof emptyMenu>): MenuRequest => ({ status: "ready", menu });

test("shows original names only for other languages with a distinct display name", () => {
  const dish = { name: "Mushroom hot pot", original_name: "버섯전골" };
  assert.equal(displayOriginalName(dish, "ko"), undefined);
  assert.equal(displayOriginalName(dish, "en"), "버섯전골");
  assert.equal(displayOriginalName({ name: " 약고추장 ", original_name: "약고추장" }, "zh"), undefined);
  assert.equal(displayOriginalName({ name: "계란 후라이 ", original_name: " 계란\t\u00a0후라이\n" }, "sv"), undefined);
  assert.equal(displayOriginalName({ name: "버섯전골", original_name: "   " }, "en"), undefined);
  assert.equal(displayOriginalName({ name: "버섯전골" }, "en"), undefined);
});

test("observes Korean calendar and time across UTC day and meal boundaries", () => {
  assert.equal(dateInKorea(new Date("2026-11-22T14:59:59Z")), "20261122");
  assert.equal(dateInKorea(new Date("2026-11-22T15:00:00Z")), "20261123");
  assert.equal(timeInKorea(new Date("2026-11-23T04:59:59Z")), "13:59");
  assert.equal(timeInKorea(new Date("2026-11-23T05:00:00Z")), "14:00");
});

test("shows Monday through Friday across month, year, and leap-day boundaries", () => {
  assert.deepEqual(menuWeekDates("20260630"), [
    "20260629", "20260630", "20260701", "20260702", "20260703",
  ]);
  assert.deepEqual(menuWeekDates("20270101"), [
    "20261228", "20261229", "20261230", "20261231", "20270101",
  ]);
  assert.deepEqual(menuWeekDates("20240229"), [
    "20240226", "20240227", "20240228", "20240229", "20240301",
  ]);
});

test("moves a full week in either direction across a year boundary", () => {
  const next = menuWeekDates("20270101", 1);
  assert.deepEqual(next, [
    "20270104", "20270105", "20270106", "20270107", "20270108",
  ]);
  assert.deepEqual(menuWeekDates(next[4], -1), menuWeekDates("20270101"));
});

test("defaults to today, then the next or latest past menu in the displayed week", () => {
  const today = "20261125";
  const past = "20261124";
  const upcoming = "20261126";
  const dates = initialMenuDates(today);
  const results = { [past]: ready(richMenu(past)), [upcoming]: ready(richMenu(upcoming)) };
  assert.equal(pickDefaultDate(dates, today, { ...results, [today]: ready(richMenu(today)) }), today);
  assert.equal(pickDefaultDate(dates, today, { ...results, [today]: ready(emptyMenu(today)) }), upcoming);
  assert.equal(pickDefaultDate(dates, today, { [past]: results[past], [today]: ready(emptyMenu(today)) }), past);
  assert.equal(pickDefaultDate(dates, today, { ...results, [today]: { status: "error" } }), today);
  assert.equal(pickDefaultDate(dates, today, { [today]: ready(emptyMenu(today)) }), today);
  assert.equal(pickDefaultDate(dates, today, {
    [today]: ready(emptyMenu(today)),
    "20261120": ready(richMenu("20261120")),
    "20261130": ready(richMenu("20261130")),
  }), today);
});

test("both weekend days open the next Monday even when its menu is unpublished", () => {
  const monday = "20261123";
  const weekdays = ["20261123", "20261124", "20261125", "20261126", "20261127"];
  assert.deepEqual(initialMenuDates("20261127"), weekdays);
  for (const today of ["20261121", "20261122"]) {
    const dates = initialMenuDates(today);
    assert.deepEqual(dates, weekdays);
    assert.equal(pickDefaultDate(dates, today, {}), monday);
    assert.equal(pickDefaultDate(dates, today, {
      [monday]: ready(emptyMenu(monday)),
      "20261124": ready(richMenu("20261124")),
    }), monday);
  }
});

test("normalizes optional menu fields independently and retains usable items", () => {
  const menu = normalizeDayMenu(malformedMenu, "20261123", "en");
  assert.ok(menu);
  assert.equal(menu.language, "en");
  assert.equal(menu.date, "20261123");
  assert.equal(menu.salad, null);
  assert.equal(menu.dessert, null);
  assert.equal(menu.updated_at, undefined);
  const [rich, legacy] = menu.lunch;
  assert.equal(rich.description, "");
  assert.equal(rich.original_name, undefined);
  assert.equal(rich.info?.summary, "A valid summary alongside invalid metadata.");
  assert.equal(rich.info?.detail, undefined);
  assert.equal(rich.info?.similar_to, undefined);
  assert.equal(rich.info?.spice, undefined);
  assert.equal(rich.info?.vegetarian, undefined);
  assert.equal(rich.info?.vegan, true);
  assert.deepEqual(rich.info?.contains, ["soy"]);
  assert.equal(rich.info?.may_contain, undefined);
  assert.deepEqual(rich.sub_items?.map(item => item.name), ["Seasoned tofu"]);
  assert.equal(rich.sub_items?.[0].summary, "A valid side note.");
  assert.equal(rich.sub_items?.[0].original_name, undefined);
  assert.equal(rich.sub_items?.[0].spice, undefined);
  assert.equal(rich.sub_items?.[0].vegan, undefined);
  assert.deepEqual(rich.sub_items?.[0].contains, ["soy"]);
  assert.equal(legacy.description, "");
  assert.equal(legacy.info, undefined);
  assert.equal(legacy.sub_items, undefined);
  assert.deepEqual(sideItems(legacy).map(item => item.name), ["Rice", "Kimchi"]);
  assert.equal(normalizeDayMenu({ ...malformedMenu, updated_at: "yesterday" }, "20261123", "en")?.updated_at, undefined);
  assert.equal(normalizeDayMenu(richMenu("20261123"), "20261123", "en")?.updated_at, "2026-11-23T03:07:00Z");
});

test("rejects responses with invalid required meal arrays or item structure", () => {
  const date = "20261123";
  assert.equal(normalizeDayMenu({ lunch: [], dinner: null }, date, "en"), undefined);
  assert.equal(normalizeDayMenu({ lunch: [{ name: 10, sub_menus: [] }], dinner: [] }, date, "en"), undefined);
  assert.equal(normalizeDayMenu({ lunch: [], dinner: [{ name: "Soup", sub_menus: "Rice" }] }, date, "en"), undefined);
});

test("distinguishes loading, error, unpublished and confirmed empty weekday menus", () => {
  const today = "20261123";
  const future = "20261124";
  assert.equal(menuState(today, today), "loading");
  assert.equal(menuState(future, today, { status: "error" }), "error");
  assert.equal(menuState(future, today, ready(emptyMenu(future))), "unpublished");
  assert.equal(menuState(today, today, ready(emptyMenu(today))), "empty");
  assert.equal(menuState("20261120", today, ready(emptyMenu("20261120"))), "empty");
  assert.equal(menuState(today, today, ready(richMenu(today))), "menu");
  assert.equal(menuState(today, today, ready({ ...emptyMenu(today), dessert: mainDish })), "menu");
});

test("localizes numbered corners and keeps other names verbatim", () => {
  assert.equal(cornerLabel("코너2", "ko"), "코너2");
  assert.equal(cornerLabel("코너2", "en"), "Corner 2");
  assert.equal(cornerLabel("코너2", "zh"), "2号窗口");
  assert.equal(cornerLabel("코너2", "sv"), "Disk 2");
  assert.equal(cornerLabel("Special", "en"), "Special");
});

test("includes the self-service main name once and removes the salad title from its chips", () => {
  const item = { ...mainDish, name: "Brown Rice", sub_menus: ["Cabbage", "Brown Rice ", "Cabbage", ""] };
  assert.deepEqual(extraMenuChips(item, "selfService"), ["Brown Rice", "Cabbage"]);
  assert.deepEqual(extraMenuChips(item, "salad"), ["Cabbage"]);
});

test("uses each extra menu's meal type, with lunch as the cafeteria default", () => {
  const mealTypes = {
    lunch: ["중식", "lunch", " Lunch ", "", "  ", "unknown"],
    dinner: ["석식", "dinner", " Dinner "],
  } as const;
  for (const [expected, values] of Object.entries(mealTypes)) {
    for (const meal_type of values) {
      assert.equal(extraMenuMeal({ ...mainDish, meal_type }), expected, JSON.stringify(meal_type));
    }
  }
});

test("uses rich side items with a legacy fallback and only recognizes original Korean staple names", () => {
  assert.deepEqual(sideItems(mainDish), mainDish.sub_items);
  assert.deepEqual(sideItems({ ...mainDish, sub_items: [] }), mainDish.sub_menus.map(name => ({ name })));
  assert.equal(isStaple(" 쌀밥 "), true);
  assert.equal(isStaple("배추김치"), true);
  assert.equal(isStaple("Rice"), false);
  assert.equal(isStaple(undefined), false);
});

test("uses saved language, then browser preference order, then English", () => {
  assert.equal(selectLanguage("sv", ["ko-KR"]), "sv");
  assert.equal(selectLanguage(null, ["fr-FR", "zh-Hant-TW", "en-US"]), "zh");
  assert.equal(selectLanguage("invalid", ["sv-FI", "ko-KR"]), "sv");
  assert.equal(selectLanguage(null, ["en-GB", "ko-KR"]), "en");
  assert.equal(selectLanguage(null, ["fr", "de"]), "en");
  assert.equal(selectLanguage(null, []), "en");
});
