import type { DayMenu, Language, MenuItem } from "../src/types/menu";

export const mainDish: MenuItem = {
  id: 1,
  name: "Mushroom hot pot",
  meal_type: "중식",
  corner_name: "코너1",
  description: "The original API description for a bowl of soup.",
  original_name: "버섯전골",
  info: {
    summary: "A cozy mushroom and vegetable hot pot.",
    detail: "Several kinds of mushrooms cook in a light broth with greens and red pepper. The longer description stays readable on narrow screens.",
    similar_to: "A vegetable sukiyaki with a lighter broth.",
    how_to_eat: "Spoon the vegetables and broth over your rice.",
    spice: 0,
    contains: ["soy", "wheat"],
    may_contain: ["egg"],
    vegetarian: true,
  },
  sub_menus: ["Steamed rice", "Seasoned bean sprouts", "Crunchy radish"],
  sub_items: [
    { name: "Steamed rice", original_name: "쌀밥" },
    {
      name: "Seasoned bean sprouts", original_name: "숙주나물", summary: "Tender bean sprouts seasoned with sesame oil.",
      spice: 1, contains: ["soy"], may_contain: ["peanut"], vegan: true,
    },
    { name: "Crunchy radish" },
  ],
};

export const koreanDish: MenuItem = {
  id: 3,
  name: "오색비빔밥*계란후라이",
  original_name: "오색비빔밥*계란후라이",
  meal_type: "중식",
  corner_name: "코너1",
  description: "",
  sub_menus: [],
  sub_items: [
    { name: "약고추장", original_name: "약고추장", summary: "고기를 넣어 볶은 고추장 양념" },
    { name: "계란 후라이", original_name: "달걀부침", summary: "기름에 부친 계란" },
  ],
};

export function emptyMenu(date: string, language: Language = "en"): DayMenu {
  return { date, language, lunch: [], dinner: [], dessert: null, salad: null };
}

export function richMenu(date: string, language: Language = "en"): DayMenu {
  return {
    ...emptyMenu(date, language),
    lunch: [mainDish],
    dinner: [{ ...mainDish, id: 2, name: "Evening noodles", info: undefined, sub_items: undefined }],
    updated_at: "2026-11-23T03:07:00Z",
  };
}

export const malformedMenu = {
  language: "ko",
  updated_at: ["2026-11-23T03:07:00Z"],
  lunch: [{
    ...mainDish,
    description: null,
    original_name: 7,
    info: {
      summary: "A valid summary alongside invalid metadata.",
      detail: { text: "Wrong type" },
      similar_to: false,
      spice: 2.5,
      contains: ["soy", 42, "not-an-ingredient"],
      may_contain: "egg",
      vegetarian: "false",
      vegan: true,
    },
    sub_items: [
      null,
      { name: 31 },
      { name: "Seasoned tofu", summary: "A valid side note.", original_name: 12, spice: "3", contains: ["soy", null], vegan: [] },
    ],
  }, {
    name: "Legacy lunch",
    sub_menus: ["Rice", 42, "Kimchi"],
    sub_items: { name: "Invalid list" },
    info: ["Invalid object"],
  }],
  dinner: [],
};
