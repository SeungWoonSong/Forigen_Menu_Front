import { expect, test } from "@playwright/test";
import type { Browser, Locator, Page, TestInfo } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { cornerLabel, dateLabel, LANGUAGES } from "../src/lib/menu";
import { menuCopy } from "../src/lib/menu-copy";
import type { Language } from "../src/types/menu";
import { emptyMenu, koreanDish, mainDish, malformedMenu, richMenu } from "./menu-fixtures";

const monday = "20261123";
const tuesday = "20261124";
const sunday = "20261122";
const wednesday = "20261125";
const morning = "2026-11-23T01:00:00Z";
const sizes = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };
type Size = keyof typeof sizes;
const languages = Object.keys(LANGUAGES) as Language[];
const themes = ["light", "dark"] as const;
const hotPenguinSelector = 'img[src*="spicy.png"]';

async function setup(
  browser: Browser, size: Size,
  { now = morning, language = "en", saved = true, dark = false, width = sizes[size].width }: {
    now?: string; language?: Language; saved?: boolean; dark?: boolean; width?: number;
  } = {},
) {
  const context = await browser.newContext({
    viewport: { ...sizes[size], width }, locale: language, timezoneId: "America/Los_Angeles",
    colorScheme: dark ? "dark" : "light", reducedMotion: "reduce",
    isMobile: size === "mobile", hasTouch: size === "mobile",
    deviceScaleFactor: size === "mobile" ? 3 : 1,
  });
  const page = await context.newPage();
  if (saved) await page.addInitScript(lang => localStorage.setItem("gasan-menu-language", lang), language);
  await page.clock.setFixedTime(new Date(now));
  return { page, context };
}

async function screenshot(page: Page, name: string, info: TestInfo, fullPage = false) {
  const directory = process.env.MENU_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const path = directory ? join(directory, `${name}.png`) : info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled", fullPage });
  await info.attach(name, { path, contentType: "image/png" });
}

async function expectPenguin(image: Locator, filename: string) {
  await expect(image).toHaveAttribute("src", new RegExp(`${filename}\\.png`));
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}

async function expectHotPenguinSpeech(card: Locator, language: Language) {
  const penguin = card.locator(hotPenguinSelector);
  await expect(penguin).toHaveCount(1);
  await penguin.scrollIntoViewIfNeeded();
  await expectPenguin(penguin, "spicy");
  const group = penguin.locator("..");
  await expect(group).toHaveAttribute("aria-hidden", "true");
  const speech = group.getByText(menuCopy[language].spicySpeech, { exact: true });
  await expect(speech).toHaveCSS("font-size", "11px");
  await expect(speech).toHaveCSS("font-weight", "600");
  const tail = await speech.evaluate(element => {
    const style = getComputedStyle(element, "::before");
    return { content: style.content, right: parseFloat(style.right), width: parseFloat(style.width) };
  });
  expect(tail.content).toBe('""');
  expect(tail.right).toBeLessThan(0);

  const bounds = (await card.boundingBox())!;
  const image = (await penguin.boundingBox())!;
  const bubble = (await speech.boundingBox())!;
  const title = (await card.getByRole("heading", { level: 4 }).boundingBox())!;
  const rightInset = bounds.x + bounds.width - image.x - image.width;
  expect(image.width).toBe(40);
  expect(image.height).toBe(40);
  expect(bubble.height).toBe(22);
  expect(bubble.y + bubble.height / 2).toBeCloseTo(image.y + image.height / 2, 0);
  const tailEnd = bubble.x + bubble.width - tail.right + tail.width * (Math.SQRT2 - 1) / 2;
  expect(tailEnd).toBeLessThanOrEqual(image.x);
  expect(rightInset).toBeGreaterThan(0);
  expect(rightInset).toBeLessThanOrEqual(21);
  expect(image.y).toBeGreaterThan(bounds.y);
  expect(Math.max(image.y + image.height, bubble.y + bubble.height)).toBeLessThanOrEqual(title.y);

  const row = group.locator("..");
  const original = row.locator(':scope > span[lang="ko"]');
  const badge = row.locator(':scope > span:not([lang])');
  for (const label of [badge, original]) {
    if (await label.count()) {
      const box = (await label.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(bubble.x);
      await expect(label).toBeVisible();
      expect(await label.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(
        await label.evaluate(element => element.clientWidth),
      );
    }
  }
  return { badge, original };
}

async function expectErrorArtwork(image: Locator) {
  await expectPenguin(image, "error");
  // The optimized image URL can stay the same after an asset replacement.
  const difference = await image.evaluate(async element => {
    const original = new Image();
    original.src = "/penguin/error.png";
    await original.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48;
    const context = canvas.getContext("2d")!;
    const pixels = (source: HTMLImageElement) => {
      context.clearRect(0, 0, 48, 48);
      context.drawImage(source, 0, 0, 48, 48);
      return context.getImageData(0, 0, 48, 48).data;
    };
    const expected = pixels(original);
    const rendered = pixels(element as HTMLImageElement);
    return rendered.reduce((sum, value, index) => sum + Math.abs(value - expected[index]), 0) / rendered.length;
  });
  expect(difference).toBeLessThan(5);
}

function tab(page: Page, date: string, language: Language = "en") {
  const numeric = dateLabel(date, language, true).split(" ")[0];
  return page.getByRole("tab", { name: new RegExp(`\\b${numeric}\\b`) });
}

async function expectTabsInStrip(page: Page, ...tabs: Locator[]) {
  const strip = (await page.getByRole("tablist").boundingBox())!;
  for (const tab of tabs) {
    const bounds = (await tab.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(strip.x - 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(strip.x + strip.width + 1);
  }
}

async function expectViewportWidth(page: Page, width: number) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions).toEqual({ scrollWidth: width, clientWidth: width, innerWidth: width });
  return dimensions;
}

const menuRoute = "**/api/menu/*?lang=*";
const mondayRoute = `**/api/menu/${monday}?lang=*`;

async function fixtureMenu(page: Page) {
  await page.route(menuRoute, route => {
    const url = new URL(route.request().url());
    const date = url.pathname.split("/").pop()!;
    const language = url.searchParams.get("lang") as Language;
    return route.fulfill({ json: date === monday ? richMenu(date, language) : emptyMenu(date, language) });
  });
}

const expectedTabLabels = {
  ko: ["오늘 11/23", "내일 11/24", "11/25 (수)"],
  en: ["Today 11/23", "Tomorrow 11/24", "11/25 Wed"],
  zh: ["今天 11/23", "明天 11/24", "11/25 周三"],
  sv: ["I dag 23/11", "I morgon 24/11", "25/11 ons"],
};

for (const width of [390, 375, 430]) {
  for (const language of languages) {
    for (const theme of themes) {
      test(`date strip fits ${width}px in ${language} and ${theme} mode`, async ({ browser }) => {
        const { page, context } = await setup(browser, "mobile", { width, language, dark: theme === "dark" });
        try {
          await page.route(menuRoute, route => {
            const date = new URL(route.request().url()).pathname.split("/").pop()!;
            return route.fulfill({ json: richMenu(date, language) });
          });
          await page.goto("/");
          const [today, tomorrow, later] = [monday, tuesday, wednesday].map(date => tab(page, date, language));
          for (const [index, button] of [today, tomorrow, later].entries()) {
            await expect(button).toHaveAccessibleName(`${expectedTabLabels[language][index]} ${menuCopy[language].available}`);
          }
          const dateStrip = page.getByRole("tablist");
          expect(await dateStrip.evaluate(element => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
          for (const button of await dateStrip.getByRole("tab").all()) {
            const layout = await button.evaluate(element => {
              const range = document.createRange();
              range.selectNodeContents(element.firstElementChild!);
              return { lines: range.getClientRects().length, height: element.getBoundingClientRect().height };
            });
            expect(layout).toEqual({ lines: 1, height: 28 });
          }
          await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
          await expectViewportWidth(page, width);
          await expectTabsInStrip(page, today, tomorrow);
          await tomorrow.tap();
          await expect(tomorrow).toHaveAttribute("aria-selected", "true");
          await expect(today).toHaveAttribute("aria-selected", "false");
          await expect(today).toHaveAttribute("aria-current", "date");
          await expect(today).toHaveCSS("font-weight", "700");
          await expectViewportWidth(page, width);
        } finally {
          await context.close();
        }
      });
    }
  }
}

test("shows all seven date tabs without scrolling when they fit on desktop", async ({ browser }) => {
  const { page, context } = await setup(browser, "desktop");
  try {
    await page.route(menuRoute, route => {
      const date = new URL(route.request().url()).pathname.split("/").pop()!;
      return route.fulfill({ json: richMenu(date) });
    });
    await page.goto("/");
    await expect(tab(page, wednesday)).toHaveAccessibleName(`${expectedTabLabels.en[2]} ${menuCopy.en.available}`);
    await page.evaluate(() => document.fonts.ready);
    const strip = page.getByRole("tablist");
    await expect(strip.getByRole("tab")).toHaveCount(7);
    const { scrollWidth, clientWidth, scrollLeft } = await strip.evaluate(element => ({
      scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, scrollLeft: element.scrollLeft,
    }));
    expect(scrollWidth).toBe(clientWidth);
    expect(scrollLeft).toBe(0);
  } finally {
    await context.close();
  }
});

const liveLayouts = [
  ...languages.flatMap(language => themes.map(theme => ({ size: "mobile" as const, language, theme }))),
  ...languages.map(language => ({ size: "desktop" as const, language, theme: "light" as const })),
];

for (const { size, language, theme } of liveLayouts) {
  test(`@live ${language} Monday menu on ${size} in ${theme} mode`, async ({ browser }, info) => {
    const { page, context } = await setup(browser, size, { language, dark: theme === "dark" });
    try {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: dateLabel(monday, language) })).toBeVisible();
      await expect(tab(page, monday, language)).toHaveAttribute("aria-selected", "true");
      await expect(tab(page, monday, language)).toContainText(menuCopy[language].today);
      await expect(tab(page, monday, language)).toContainText(menuCopy[language].available);
      await expect(tab(page, tuesday, language)).toContainText(menuCopy[language].tomorrow);
      await expect(page.getByRole("button", { name: LANGUAGES[language].name })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("heading", { name: menuCopy[language].lunch, exact: true })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      const corner = { ko: "코너1", en: "Corner 1", zh: "1号窗口", sv: "Disk 1" }[language];
      await expect(page.getByText(corner, { exact: true }).first()).toBeVisible();
      for (const list of await page.locator("article ul").all()) {
        expect(await list.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(
          await list.evaluate(element => element.clientWidth),
        );
      }
      const copy = menuCopy[language];
      const lunch = page.getByRole("region", { name: copy.lunch, exact: true });
      const dinner = page.getByRole("region", { name: copy.dinner, exact: true });
      const hotDishes = lunch.locator("article").filter({ has: page.locator(hotPenguinSelector) });
      await expect(hotDishes.first()).toBeVisible();
      for (const dish of await hotDishes.all()) {
        await expectHotPenguinSpeech(dish, language);
      }
      await expect(lunch.getByRole("heading", { level: 4 })).toHaveText([
        ...(await lunch.locator("article h4").allTextContents()), copy.salad, copy.selfService,
      ]);
      await expect(dinner.locator("article")).toHaveCount(1);
      await expect(dinner.getByRole("heading", { name: copy.salad })).toHaveCount(0);
      await expect(dinner.getByRole("heading", { name: copy.selfService })).toHaveCount(0);
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
      const dimensions = await expectViewportWidth(page, sizes[size].width);
      const name = `11-23-${language}-${size}-${theme}`;
      console.log(name, JSON.stringify(dimensions));
      await screenshot(page, name, info, true);
    } finally {
      await context.close();
    }
  });
}

for (const size of Object.keys(sizes) as Size[]) {
  test(`@live Tuesday self-service and salad on ${size}`, async ({ browser }, info) => {
    const { page, context } = await setup(browser, size);
    try {
      await page.goto("/");
      await expect(tab(page, tuesday)).toContainText(menuCopy.en.available);
      await tab(page, tuesday).click();
      const lunch = page.getByRole("region", { name: menuCopy.en.lunch, exact: true });
      const bar = lunch.locator("section").filter({ has: page.getByRole("heading", { name: "Self-service bar" }) });
      await expect(bar.getByRole("listitem").filter({ hasText: /^Brown Rice$/ })).toHaveCount(1);
      await expect(bar.getByRole("heading")).toHaveCount(1);
      const salad = lunch.locator("section").filter({ has: page.getByRole("heading", { name: "Salad & take-out" }) });
      const saladName = await salad.getByRole("heading", { level: 5 }).innerText();
      await expect(salad.getByRole("listitem").filter({ hasText: saladName })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: dateLabel(tuesday, "en") })).toBeVisible();
      await bar.scrollIntoViewIfNeeded();
      await screenshot(page, `11-24-en-${size}`, info);
    } finally {
      await context.close();
    }
  });
}

test("@live Sunday evening opens Monday with lunch first and has a separate closed day panel", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "mobile", { now: "2026-11-22T11:00:00Z" });
  try {
    await page.goto("/");
    await expect(page.getByRole("complementary").filter({ hasText: menuCopy.en.closed })).toBeVisible();
    await expect(tab(page, monday)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: dateLabel(monday, "en") })).toBeVisible();
    await expectTabsInStrip(page, tab(page, sunday), tab(page, monday));
    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText(menuCopy.en.lunch);
    await screenshot(page, "11-22-weekend-first-view-mobile", info);
    await tab(page, sunday).click();
    await expect(page.getByRole("heading", { name: menuCopy.en.closed })).toBeVisible();
    await screenshot(page, "11-22-closed-mobile", info);
    await page.getByRole("button", { name: /Next business day/ }).click();
    await expect(tab(page, monday)).toHaveAttribute("aria-selected", "true");
  } finally {
    await context.close();
  }
});

test("opens Friday on a Sunday with an unpublished Monday and links to Monday", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "mobile", { now: "2026-11-22T11:00:00Z" });
  try {
    await page.route(menuRoute, route => {
      const date = new URL(route.request().url()).pathname.split("/").pop()!;
      return route.fulfill({ json: date === "20261120" || date === tuesday ? richMenu(date) : emptyMenu(date) });
    });
    await page.goto("/");
    const banner = page.getByRole("complementary").filter({ hasText: menuCopy.en.closed });
    const nextDay = banner.getByRole("button", { name: menuCopy.en.nextBusiness(dateLabel(monday, "en")) });
    await expect(nextDay).toBeVisible();
    await expect(tab(page, "20261120")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText(menuCopy.en.lunch);
    await expectTabsInStrip(page, tab(page, sunday), tab(page, "20261120"));
    await screenshot(page, "weekend-unpublished-fallback-mobile", info);
    await nextDay.click();
    await expect(tab(page, monday)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: menuCopy.en.unpublished })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("shows today beside the next menu when today's menu is empty", async ({ browser }) => {
  const { page, context } = await setup(browser, "mobile");
  try {
    await page.route(menuRoute, route => {
      const date = new URL(route.request().url()).pathname.split("/").pop()!;
      return route.fulfill({ json: date === tuesday ? richMenu(date) : emptyMenu(date) });
    });
    await page.goto("/");
    const today = tab(page, monday);
    const nextMenu = tab(page, tuesday);
    await expect(nextMenu).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: dateLabel(tuesday, "en") })).toBeVisible();
    await expectTabsInStrip(page, today, nextMenu);
    await expectViewportWidth(page, sizes.mobile.width);
  } finally {
    await context.close();
  }
});

test("distinguishes a future weekday from a confirmed past empty menu", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "mobile");
  try {
    await fixtureMenu(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: mainDish.name })).toBeVisible();
    await tab(page, tuesday).click();
    await expect(page.getByRole("heading", { name: menuCopy.en.unpublished })).toBeVisible();
    await screenshot(page, "future-unpublished-mobile", info);
    await tab(page, "20261120").click();
    await expect(page.getByRole("heading", { name: menuCopy.en.empty })).toBeVisible();
    await screenshot(page, "past-empty-mobile", info);
  } finally {
    await context.close();
  }
});

for (const size of Object.keys(sizes) as Size[]) {
  test(`shows loading, a server failure, and data after retry on ${size}`, async ({ browser }, info) => {
    const { page, context } = await setup(browser, size);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    try {
      await fixtureMenu(page);
      await page.route(mondayRoute, async route => {
        await gate;
        await route.fulfill({ status: 500, headers: { "Cache-Control": "no-store" }, json: { error: "API unavailable" } });
      }, { times: 1 });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: menuCopy.en.loading })).toBeVisible();
      await screenshot(page, `loading-${size}`, info);
      release();
      const alert = page.getByRole("tabpanel").getByRole("alert");
      await expect(alert).toContainText(menuCopy.en.error);
      await expectErrorArtwork(alert.locator("img"));
      await screenshot(page, `server-error-${size}`, info);
      await page.getByRole("button", { name: menuCopy.en.retry }).click();
      await expect(page.getByRole("heading", { name: mainDish.name })).toBeVisible();
    } finally {
      release();
      await context.close();
    }
  });
}

test("network and malformed-success responses remain retryable errors", async ({ browser }) => {
  const { page, context } = await setup(browser, "desktop");
  try {
    await fixtureMenu(page);
    await page.route(mondayRoute, route => route.fulfill({ json: { error: "Malformed success" } }), { times: 1 });
    await page.route(mondayRoute, route => route.abort("failed"), { times: 1 });
    await page.goto("/");
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(page.getByRole("tabpanel").getByRole("alert")).toContainText(menuCopy.en.error);
      await page.getByRole("button", { name: menuCopy.en.retry }).click();
    }
    await expect(page.getByRole("heading", { name: mainDish.name })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("renders usable dishes when optional API fields are malformed", async ({ browser }) => {
  const { page, context } = await setup(browser, "mobile");
  const errors: Error[] = [];
  try {
    page.on("pageerror", error => errors.push(error));
    await fixtureMenu(page);
    await page.route(mondayRoute, route => route.fulfill({ json: malformedMenu }));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Legacy lunch" })).toBeVisible();
    await expect(page.getByText("A valid summary alongside invalid metadata.")).toBeVisible();
    await expect(page.getByRole("article").getByText("Kimchi", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Seasoned tofu" }).tap();
    await expect(page.getByRole("dialog")).toContainText("A valid side note.");
    await expect(page.getByRole("dialog")).toContainText("Contains · Soy");
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("uses browser language without a modal and remembers a dismissed hint", async ({ browser }) => {
  const { page, context } = await setup(browser, "mobile", { language: "zh", saved: false });
  try {
    await fixtureMenu(page);
    await page.goto("/");
    await expect(page.getByText(menuCopy.zh.welcome)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: menuCopy.zh.change, exact: true }).click();
    await expect(page.getByRole("button", { name: "中文", exact: true })).toBeFocused();
    await page.getByRole("button", { name: menuCopy.zh.close }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await expect(page.getByText(menuCopy.zh.welcome)).toHaveCount(0);
    await page.getByRole("button", { name: "Svenska", exact: true }).click();
    await expect(page.getByRole("heading", { name: dateLabel(monday, "sv") })).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "sv");
  } finally {
    await context.close();
  }
});

for (const size of Object.keys(sizes) as Size[]) {
  test(`shows Korean menu names only once on ${size}`, async ({ browser }) => {
    const { page, context } = await setup(browser, size, { language: "ko" });
    try {
      await page.route(menuRoute, route => {
        const date = new URL(route.request().url()).pathname.split("/").pop()!;
        const menu = emptyMenu(date, "ko");
        return route.fulfill({ json: { ...menu, lunch: date === monday ? [koreanDish] : [] } });
      });
      await page.goto("/");
      const card = page.locator("article").filter({ has: page.getByRole("heading", { name: koreanDish.name, exact: true }) });
      await expect(card.getByText(koreanDish.name, { exact: true })).toHaveCount(1);
      await expect(card.getByText("코너1", { exact: true })).toBeVisible();
      for (const side of koreanDish.sub_items!) {
        const chip = card.getByRole("button", { name: side.name, exact: true });
        const details = size === "mobile" ? page.getByRole("dialog", { name: side.name })
          : page.locator("[data-radix-popper-content-wrapper]");
        if (size === "mobile") await chip.tap();
        else await chip.hover();
        await expect(details.getByText(side.summary!, { exact: true })).toBeVisible();
        await expect(details.getByText(side.name, { exact: true })).toHaveCount(1);
        await expect(details.locator('[lang="ko"]')).toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(details).toHaveCount(0);
      }
    } finally {
      await context.close();
    }
  });
}

test("omits the estimate label from cards, side sheets and tooltips in every language", async ({ browser }) => {
  const estimateLabel = /^(추정|estimated|推测|uppskattat)$/;
  const side = mainDish.sub_items![1];

  for (const language of languages) {
    for (const size of Object.keys(sizes) as Size[]) {
      await test.step(`${language} on ${size}`, async () => {
        const { page, context } = await setup(browser, size, { language });
        const copy = menuCopy[language];
        try {
          await fixtureMenu(page);
          await page.goto("/");
          const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: mainDish.name }) });
          await expect(card.getByText(copy.spice[0], { exact: true })).toBeVisible();
          await expect(card.getByText(estimateLabel)).toHaveCount(0);

          const chip = card.getByRole("button", { name: side.name });
          const details = size === "mobile" ? page.getByRole("dialog", { name: side.name })
            : page.locator("[data-radix-popper-content-wrapper]");
          if (size === "mobile") await chip.tap();
          else await chip.hover();
          await expect(details.getByText(copy.spice[1], { exact: true })).toBeVisible();
          await expect(details.getByText(copy.allergy, { exact: true })).toBeVisible();
          await expect(details.getByText(estimateLabel)).toHaveCount(0);
        } finally {
          await context.close();
        }
      });
    }
  }
});

test("renders rich API fields and opens a dismissible mobile side sheet", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "mobile");
  try {
    await fixtureMenu(page);
    await page.goto("/");
    const dish = page.locator("article").filter({ has: page.getByRole("heading", { name: mainDish.name }) });
    await expect(dish.getByText(mainDish.original_name!, { exact: true })).toBeVisible();
    await expect(dish.getByText(mainDish.info!.summary!, { exact: true })).toBeVisible();
    await expect(dish.getByText(mainDish.info!.detail!, { exact: true })).toBeVisible();
    await expect(dish.getByText(mainDish.description, { exact: true })).toHaveCount(0);
    await expect(dish.getByText(mainDish.info!.similar_to!, { exact: true })).toBeVisible();
    await expect(dish.getByText(mainDish.info!.how_to_eat!, { exact: true })).toBeVisible();
    await expectPenguin(dish.locator("aside img").first(), "mascot");
    await expectPenguin(dish.locator("aside img").last(), "howtoeat");
    for (const tag of ["Not spicy", "Vegetarian", "Contains · Soy, Wheat", "May contain · Egg"]) {
      await expect(dish.getByText(tag, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("Updated 12:07")).toBeVisible();
    await expect(dish.getByText("Steamed rice")).toHaveClass(/border-dashed/);
    await expect(dish.getByText("Crunchy radish")).not.toHaveClass(/border-dashed/);
    await expect(dish.getByRole("button", { name: "Steamed rice" })).toHaveCount(0);
    const chip = dish.getByRole("button", { name: "Seasoned bean sprouts" });
    const sheet = page.getByRole("dialog", { name: "Seasoned bean sprouts" });
    await chip.tap();
    await expect(sheet).toBeVisible();
    await expectViewportWidth(page, sizes.mobile.width);
    for (const detail of ["숙주나물", "Tender bean sprouts seasoned with sesame oil.", "Mild", "Vegan", "Contains · Soy", "May contain · Peanuts", menuCopy.en.allergy]) {
      await expect(sheet.getByText(detail, { exact: true })).toBeVisible();
    }
    await screenshot(page, "rich-side-sheet-mobile", info);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(chip).toBeFocused();
    await chip.tap();
    await page.touchscreen.tap(15, 100);
    await expect(sheet).toHaveCount(0);
  } finally {
    await context.close();
  }
});

for (const width of [375, 390, 430, 1280]) {
  for (const language of languages) {
    for (const theme of themes) {
      test(`fits the hot penguin and speech bubble at ${width}px in ${language} and ${theme} mode`, async ({ browser }) => {
        const size = width === sizes.desktop.width ? "desktop" : "mobile";
        const { page, context } = await setup(browser, size, { width, language, dark: theme === "dark" });
        const hotDish = { ...mainDish, original_name: "청양풍해물볶음우동&유부초밥세트", info: { spice: 3 as const } };
        const cornerlessDish = { ...hotDish, id: 2, name: "Hot noodles", corner_name: "", original_name: undefined };
        try {
          await fixtureMenu(page);
          await page.route(mondayRoute, route => route.fulfill({
            json: { ...emptyMenu(monday, language), lunch: [hotDish, cornerlessDish] },
          }));
          await page.goto("/");
          await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
          for (const dish of [hotDish, cornerlessDish]) {
            const heading = page.getByRole("heading", { name: dish.name, exact: true });
            const card = page.getByRole("article").filter({ has: heading });
            const { badge, original } = await expectHotPenguinSpeech(card, language);

            if (dish.corner_name) {
              await expect(badge).toHaveText(cornerLabel(dish.corner_name, language));
            }
            if (language !== "ko" && dish.original_name) {
              await expect(original).toHaveText(dish.original_name);
              const name = (await original.boundingBox())!;
              const corner = (await badge.boundingBox())!;
              expect(corner.x + corner.width).toBeLessThan(name.x);
              if (width === 375) expect(name.height).toBeGreaterThan(16);
            } else {
              await expect(original).toHaveCount(0);
            }
          }
          await expectViewportWidth(page, width);
        } finally {
          await context.close();
        }
      });
    }
  }
}

test("shows dinner first in the afternoon and opens the desktop tooltip on hover and focus", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "desktop", { now: "2026-11-23T05:00:00Z" });
  try {
    await page.route(menuRoute, route => {
      const date = new URL(route.request().url()).pathname.split("/").pop()!;
      return route.fulfill({ json: {
        ...richMenu(date),
        salad: { ...mainDish, name: "Lunch salad", meal_type: "중식" },
        dessert: { ...mainDish, name: "Lunch self-service", meal_type: "" },
      } });
    });
    await page.route(`**/api/menu/${tuesday}?lang=*`, route => route.fulfill({ json: richMenu(tuesday) }));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText(menuCopy.en.dinner);
    const lunch = page.getByRole("region", { name: menuCopy.en.lunch, exact: true });
    const dinner = page.getByRole("region", { name: menuCopy.en.dinner, exact: true });
    await expect(lunch.getByRole("heading", { level: 4 })).toHaveText([mainDish.name, menuCopy.en.salad, menuCopy.en.selfService]);
    await expect(dinner.getByRole("heading", { level: 4 })).toHaveText(["Evening noodles"]);
    await expect(page.getByText(mainDish.description, { exact: true })).toBeVisible();
    const chip = page.getByRole("button", { name: "Seasoned bean sprouts" });
    await chip.hover();
    await expect(page.getByRole("tooltip")).toBeAttached();
    await expect(page.getByText(menuCopy.en.allergy, { exact: true })).toBeVisible();
    await expectViewportWidth(page, sizes.desktop.width);
    await screenshot(page, "rich-side-tooltip-desktop", info);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.mouse.move(0, 0);
    await chip.focus();
    await expect(page.getByRole("tooltip")).toBeAttached();
    await tab(page, tuesday).click();
    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText(menuCopy.en.lunch);
  } finally {
    await context.close();
  }
});

test("places an extra in dinner only when its own meal type identifies dinner", async ({ browser }) => {
  const { page, context } = await setup(browser, "mobile");
  try {
    await page.route(menuRoute, route => {
      const date = new URL(route.request().url()).pathname.split("/").pop()!;
      return route.fulfill({ json: {
        ...richMenu(date),
        salad: { ...mainDish, name: "Evening salad", meal_type: "석식" },
        dessert: { ...mainDish, name: "Lunch self-service", meal_type: "unknown" },
      } });
    });
    await page.goto("/");
    const lunch = page.getByRole("region", { name: menuCopy.en.lunch, exact: true });
    const dinner = page.getByRole("region", { name: menuCopy.en.dinner, exact: true });
    await expect(lunch.getByRole("heading", { level: 4 })).toHaveText([mainDish.name, menuCopy.en.selfService]);
    await expect(dinner.getByRole("heading", { level: 4 })).toHaveText(["Evening noodles", menuCopy.en.salad]);
  } finally {
    await context.close();
  }
});

test("renders rich cards in dark mode", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "mobile", { dark: true });
  try {
    await fixtureMenu(page);
    const longSideName = "Supercalifragilisticexpialidocious".repeat(4);
    await page.route(mondayRoute, route => route.fulfill({
      json: {
        ...richMenu(monday),
        lunch: [{ ...mainDish, sub_items: [...mainDish.sub_items!, { name: longSideName, summary: "Seasoned vegetables." }] }],
      },
    }));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: mainDish.name })).toBeVisible();
    const longChip = page.getByRole("button", { name: longSideName });
    await expect(longChip).toBeVisible();
    expect(await longChip.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(30);
    expect(await longChip.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(
      await longChip.evaluate(element => element.clientWidth),
    );
    await screenshot(page, "rich-dark-mobile", info);
  } finally {
    await context.close();
  }
});
