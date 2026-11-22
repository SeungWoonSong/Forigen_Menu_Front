import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cornerLabel, dateInKorea, extraMenuChips, initialMenuDates, isClosedDay, isStaple,
  menuState, nextBusinessDay, pickDefaultDate, selectLanguage, sideItems, timeInKorea,
} from "../src/lib/menu";
import type { MenuRequest } from "../src/lib/menu";
import { emptyMenu, mainDish, richMenu } from "./menu-fixtures";

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
  assert.equal(pickDefaultDate(dates, "20261122", results), upcoming);
  assert.equal(pickDefaultDate(dates, "20261122", {}), today);
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
