export type Language = "ko" | "en" | "zh" | "sv";

export type SpiceLevel = 0 | 1 | 2 | 3;

export type Ingredient =
  | "pork" | "beef" | "chicken" | "fish" | "shellfish" | "crustacean"
  | "egg" | "dairy" | "tree_nut" | "peanut" | "wheat" | "soy";

interface DietaryInfo {
  spice?: SpiceLevel;
  contains?: Ingredient[];
  may_contain?: Ingredient[];
  vegan?: boolean;
}

export interface MenuInfo extends DietaryInfo {
  summary?: string;
  detail?: string;
  similar_to?: string;
  how_to_eat?: string;
  vegetarian?: boolean;
}

export interface SideItem extends DietaryInfo {
  name: string;
  original_name?: string;
  summary?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  meal_type: string;
  corner_name: string;
  description: string;
  sub_menus: string[];
  original_name?: string;
  info?: MenuInfo;
  sub_items?: SideItem[];
}

export interface DayMenu {
  date: string;
  language: Language;
  lunch: MenuItem[];
  dinner: MenuItem[];
  dessert: MenuItem | null;
  salad: MenuItem | null;
  updated_at?: string;
}
