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
