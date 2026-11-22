import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cornerLabel, dateInKorea, extraMenuChips, initialMenuDates, isClosedDay, isStaple,
  menuState, nextBusinessDay, pickDefaultDate, selectLanguage, sideItems, timeInKorea,
} from "../src/lib/menu";
import type { MenuRequest } from "../src/lib/menu";
import { normalizeDayMenu } from "../src/services/menuService";
import { emptyMenu, mainDish, malformedMenu, richMenu } from "./menu-fixtures";

const ready = (menu: ReturnType<typeof emptyMenu>): MenuRequest => ({ status: "ready", menu });

test("observes Korean calendar and time across UTC day and meal boundaries", () => {
  assert.equal(dateInKorea(new Date("2026-11-22T14:59:59Z")), "20261122");
  assert.equal(dateInKorea(new Date("2026-11-22T15:00:00Z")), "20261123");
  assert.equal(timeInKorea(new Date("2026-11-23T04:59:59Z")), "13:59");
  assert.equal(timeInKorea(new Date("2026-11-23T05:00:00Z")), "14:00");
});

test("includes both weekend dates in the Sunday calendar around Monday", () => {
  assert.deepEqual(initialMenuDates("20261122"), [
    "20261119", "20261120", "20261121", "20261122", "20261123", "20261124", "20261125",
  ]);
  assert.equal(isClosedDay("20261121"), true);
  assert.equal(isClosedDay("20261122"), true);
  assert.equal(isClosedDay("20261123"), false);
  assert.equal(nextBusinessDay("20270101"), "20270104");
});

test("defaults to today, the next menu, or the last menu in that order", () => {
  const today = "20261123";
  const past = "20261120";
  const upcoming = "20261124";
  const dates = initialMenuDates(today);
  const results = { [past]: ready(richMenu(past)), [upcoming]: ready(richMenu(upcoming)) };
  assert.equal(pickDefaultDate(dates, today, { ...results, [today]: ready(richMenu(today)) }), today);
  assert.equal(pickDefaultDate(dates, today, { ...results, [today]: ready(emptyMenu(today)) }), upcoming);
  assert.equal(pickDefaultDate(dates, today, { [past]: results[past], [today]: ready(emptyMenu(today)) }), past);
  assert.equal(pickDefaultDate(dates, today, { ...results, [today]: { status: "error" } }), today);
  assert.equal(pickDefaultDate(dates, today, { [today]: ready(emptyMenu(today)) }), today);
});

test("on a weekend opens the next business day or falls back to the latest published past menu", () => {
  const sunday = "20261122";
  const monday = "20261123";
  const friday = "20261120";
  const tuesday = "20261124";
  const dates = initialMenuDates(sunday);
  const results = {
    "20261119": ready(richMenu("20261119")),
    [friday]: ready(richMenu(friday)),
    [tuesday]: ready(richMenu(tuesday)),
  };
  assert.equal(pickDefaultDate(dates, sunday, { ...results, [monday]: ready(richMenu(monday)) }), monday);
  assert.equal(pickDefaultDate(dates, sunday, { ...results, [monday]: ready(emptyMenu(monday)) }), friday);
  assert.equal(pickDefaultDate(dates, sunday, { ...results, [monday]: { status: "error" } }), monday);
  assert.equal(pickDefaultDate(dates, sunday, { [monday]: ready(emptyMenu(monday)) }), monday);
  assert.equal(pickDefaultDate(dates, sunday, {}), monday);
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

test("distinguishes closed, loading, error, future and confirmed empty menus", () => {
  const today = "20261123";
  const future = "20261124";
  assert.equal(menuState("20261122", today), "closed");
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
