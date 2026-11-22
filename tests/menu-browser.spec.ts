import { expect, test } from "@playwright/test";
import type { Browser, Locator, Page, TestInfo } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { dateLabel, LANGUAGES } from "../src/lib/menu";
import { menuCopy } from "../src/lib/menu-copy";
import type { Language } from "../src/types/menu";
import { emptyMenu, mainDish, richMenu } from "./menu-fixtures";

const monday = "20261123";
const tuesday = "20261124";
const sunday = "20261122";
const morning = "2026-11-23T01:00:00Z";
const sizes = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };
type Size = keyof typeof sizes;

async function setup(
  browser: Browser, size: Size,
  { now = morning, language = "en", saved = true, dark = false }: {
    now?: string; language?: Language; saved?: boolean; dark?: boolean;
  } = {},
) {
  const context = await browser.newContext({
    viewport: sizes[size], locale: language, timezoneId: "America/Los_Angeles",
    colorScheme: dark ? "dark" : "light", reducedMotion: "reduce",
    isMobile: size === "mobile", hasTouch: size === "mobile",
  });
  const page = await context.newPage();
  if (saved) await page.addInitScript(lang => localStorage.setItem("gasan-menu-language", lang), language);
  await page.clock.setFixedTime(new Date(now));
  return { page, context };
}

async function screenshot(page: Page, name: string, info: TestInfo) {
  const directory = process.env.MENU_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const path = directory ? join(directory, `${name}.png`) : info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}

async function expectPenguin(image: Locator, filename: string) {
  await expect(image).toHaveAttribute("src", new RegExp(`${filename}\\.png`));
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}

function tab(page: Page, date: string, language: Language = "en") {
  return page.getByRole("tab", { name: new RegExp(dateLabel(date, language, true).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
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

for (const size of Object.keys(sizes) as Size[]) {
  for (const language of Object.keys(LANGUAGES) as Language[]) {
    test(`@live ${language} Monday menu on ${size}`, async ({ browser }, info) => {
      const { page, context } = await setup(browser, size, { language });
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
        await screenshot(page, `11-23-${language}-${size}`, info);
      } finally {
        await context.close();
      }
    });
  }
}

for (const size of Object.keys(sizes) as Size[]) {
  test(`@live Tuesday self-service and salad on ${size}`, async ({ browser }, info) => {
    const { page, context } = await setup(browser, size);
    try {
      await page.goto("/");
      await expect(tab(page, tuesday)).toContainText(menuCopy.en.available);
      await tab(page, tuesday).click();
      const bar = page.locator("section").filter({ has: page.getByRole("heading", { name: "Self-service bar" }) });
      await expect(bar.getByRole("listitem").filter({ hasText: /^Brown Rice$/ })).toHaveCount(1);
      await expect(bar.getByRole("heading")).toHaveCount(1);
      const salad = page.locator("section").filter({ has: page.getByRole("heading", { name: "Salad & take-out" }) });
      const saladName = await salad.getByRole("heading", { level: 4 }).innerText();
      await expect(salad.getByRole("listitem").filter({ hasText: saladName })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: dateLabel(tuesday, "en") })).toBeVisible();
      await bar.scrollIntoViewIfNeeded();
      await screenshot(page, `11-24-en-${size}`, info);
    } finally {
      await context.close();
    }
  });
}

test("@live Sunday opens the next menu and has a separate closed day panel", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "mobile", { now: "2026-11-22T01:00:00Z" });
  try {
    await page.goto("/");
    await expect(page.getByRole("complementary").filter({ hasText: menuCopy.en.closed })).toBeVisible();
    await expect(tab(page, monday)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: dateLabel(monday, "en") })).toBeVisible();
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
      await expectPenguin(alert.locator("img"), "error");
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

test("uses browser language without a modal and remembers a dismissed hint", async ({ browser }) => {
  const { page, context } = await setup(browser, "mobile", { language: "zh", saved: false });
  try {
    await fixtureMenu(page);
    await page.goto("/");
    await expect(page.getByText(menuCopy.zh.welcome("中文"))).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: menuCopy.zh.change, exact: true }).click();
    await expect(page.getByRole("button", { name: "中文", exact: true })).toBeFocused();
    await page.getByRole("button", { name: menuCopy.zh.close }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await expect(page.getByText(menuCopy.zh.welcome("中文"))).toHaveCount(0);
    await page.getByRole("button", { name: "Svenska", exact: true }).click();
    await expect(page.getByRole("heading", { name: dateLabel(monday, "sv") })).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "sv");
  } finally {
    await context.close();
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
    for (const tag of ["Not spicy", "Vegetarian", "Contains · Soy, Wheat", "May contain · Egg", "estimated"]) {
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
    for (const detail of ["숙주나물", "Tender bean sprouts seasoned with sesame oil.", "Mild", "Vegan", "Contains · Soy", "May contain · Peanuts", "estimated", menuCopy.en.allergy]) {
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

test("shows both penguin illustrations for hot menu tips on mobile", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "mobile");
  try {
    await fixtureMenu(page);
    const hotInfo = { ...mainDish.info!, spice: 3 as const };
    await page.route(mondayRoute, route => route.fulfill({
      json: {
        ...richMenu(monday),
        lunch: [{ ...mainDish, info: hotInfo }],
        dinner: [
          { ...mainDish, id: 2, name: "Hot noodles with a serving tip", info: { ...hotInfo, similar_to: undefined } },
          { ...mainDish, id: 3, name: "Hot noodles without tips", info: { spice: 3 } },
        ],
      },
    }));
    await page.goto("/");
    const lunch = page.locator("article").filter({ has: page.getByRole("heading", { name: mainDish.name }) });
    await expect(lunch.getByText(menuCopy.en.spice[3], { exact: true })).toBeVisible();
    await expect(lunch.getByText(hotInfo.how_to_eat!, { exact: true })).toBeVisible();
    await expectPenguin(lunch.locator("aside img").first(), "spicy");
    await expectPenguin(lunch.locator("aside img").last(), "howtoeat");
    await screenshot(page, "hot-menu-penguin-tips-mobile", info);

    const withServingTip = page.locator("article").filter({ has: page.getByRole("heading", { name: "Hot noodles with a serving tip" }) });
    await expect(withServingTip.locator("aside")).toContainText(menuCopy.en.spice[3]);
    const withoutTips = page.locator("article").filter({ has: page.getByRole("heading", { name: "Hot noodles without tips" }) });
    await expect(withoutTips.locator("aside")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("shows dinner first in the afternoon and opens the desktop tooltip on hover and focus", async ({ browser }, info) => {
  const { page, context } = await setup(browser, "desktop", { now: "2026-11-23T05:00:00Z" });
  try {
    await fixtureMenu(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText(menuCopy.en.dinner);
    await expect(page.getByText(mainDish.description, { exact: true })).toBeVisible();
    const chip = page.getByRole("button", { name: "Seasoned bean sprouts" });
    await chip.hover();
    await expect(page.getByRole("tooltip")).toBeAttached();
    await expect(page.getByText(menuCopy.en.allergy, { exact: true })).toBeVisible();
    await screenshot(page, "rich-side-tooltip-desktop", info);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.mouse.move(0, 0);
    await chip.focus();
    await expect(page.getByRole("tooltip")).toBeAttached();
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
