export type MenuCategory = string;

export type MenuOption = {
  value: string;
  label: string;
  priceCents?: number;
  available?: boolean;
  defaultSelected?: boolean;
  squareModifierId?: string;
};

export type OptionGroup = {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: MenuOption[];
  squareModifierListId?: string;
};

export type MenuVariation = {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  squareVariationId?: string;
};

export type MenuItem = {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  priceCents: number;
  category: MenuCategory;
  available?: boolean;
  featured?: boolean;
  variations?: MenuVariation[];
  optionGroups?: OptionGroup[];
  requiredAnyGroupIds?: string[];
  builderTone?: "ocean" | "leaf" | "mango";
  menuNote?: string;
  squareItemId?: string;
};

export type MenuCatalog = {
  source: "square" | "fallback";
  items: MenuItem[];
  categories: MenuCategory[];
  updatedAt: string;
  warning?: string;
};

const saladGreens: MenuOption[] = [
  { value: "shredded-iceberg", label: "Shredded iceberg" },
  { value: "romaine", label: "Romaine" },
  { value: "spinach", label: "Spinach" },
  { value: "cabbage", label: "Cabbage" },
  { value: "kale", label: "Kale" },
];

const vegetables: MenuOption[] = [
  { value: "tomato", label: "Tomato" },
  { value: "cucumber", label: "Cucumber" },
  { value: "carrot", label: "Carrot" },
  { value: "broccoli", label: "Broccoli" },
  { value: "cauliflower", label: "Cauliflower" },
  { value: "red-onion", label: "Red onion" },
  { value: "green-bell-pepper", label: "Green bell pepper" },
  { value: "mushrooms", label: "Mushrooms" },
  { value: "black-olives", label: "Black olives" },
  { value: "green-olives", label: "Green olives" },
  { value: "jalapeno", label: "Jalapeño pepper" },
  { value: "banana-pepper", label: "Banana pepper" },
  { value: "squash", label: "Squash" },
  { value: "celery", label: "Celery" },
  { value: "radish", label: "Radish" },
  { value: "avocado", label: "Avocado", priceCents: 100 },
];

const fruits: MenuOption[] = [
  { value: "pineapple", label: "Pineapple" },
  { value: "grapes", label: "Grapes" },
  { value: "green-grapes", label: "Green grapes" },
  { value: "purple-grapes", label: "Purple grapes" },
  { value: "strawberries", label: "Strawberries" },
  { value: "apples", label: "Apples" },
  { value: "cantaloupe", label: "Cantaloupe" },
  { value: "lemon", label: "Lemon" },
  { value: "banana", label: "Banana" },
  { value: "blueberries", label: "Blueberries" },
  { value: "orange", label: "Orange" },
  { value: "kiwi", label: "Kiwi" },
  { value: "dates", label: "Dates" },
  { value: "raisins", label: "Raisins" },
];

const proteins: MenuOption[] = [
  { value: "chicken", label: "Chicken (4 oz)", priceCents: 200 },
  { value: "ham", label: "Ham" },
  { value: "diced-smoked-ham", label: "Diced smoked ham" },
  { value: "turkey", label: "Turkey" },
  { value: "bacon", label: "Air-fried bacon", priceCents: 100 },
  { value: "tuna", label: "Tuna" },
  { value: "egg", label: "Egg" },
  { value: "hard-boiled-egg", label: "Hard-boiled egg" },
  { value: "black-beans", label: "Black beans" },
  { value: "firm-tofu", label: "Firm tofu" },
];

const saladGroups: OptionGroup[] = [
  {
    id: "greens",
    label: "Leafy greens",
    help: "Choose your base",
    required: true,
    maxSelections: 2,
    options: saladGreens,
  },
  {
    id: "vegetables",
    label: "Vegetables",
    help: "Open the vegetable bar",
    options: vegetables,
  },
  {
    id: "fruits",
    label: "Fruits",
    help: "Add something bright",
    options: fruits,
  },
  {
    id: "proteins",
    label: "Proteins",
    help: "Add one or mix your favorites",
    options: proteins,
  },
  {
    id: "nuts-seeds",
    label: "Nuts & seeds",
    options: [
      { value: "walnuts", label: "Walnuts" },
      { value: "almonds", label: "Almonds" },
      { value: "sunflower-seeds", label: "Sunflower seeds" },
      { value: "cashews", label: "Cashews" },
      { value: "honey-pecans", label: "Honey pecans" },
      { value: "peanuts", label: "Peanuts" },
    ],
  },
  {
    id: "bread-crackers",
    label: "Breads & crackers",
    options: [
      { value: "croutons", label: "Croutons" },
      { value: "wheat-crackers", label: "Wheat crackers" },
      { value: "wheat-thins", label: "Wheat Thins" },
    ],
  },
  {
    id: "rice-konjac",
    label: "Rice & konjac",
    maxSelections: 1,
    options: [
      { value: "brown-rice", label: "Brown rice" },
      { value: "konjac-angel-hair", label: "Konjac angel hair" },
      { value: "konjac-fettuccine", label: "Konjac fettuccine" },
      { value: "konjac-spaghetti", label: "Konjac spaghetti" },
      { value: "konjac-rice", label: "Konjac rice" },
    ],
  },
  {
    id: "cheeses",
    label: "Cheeses",
    options: [
      { value: "cheddar", label: "Cheddar" },
      { value: "pepper-jack", label: "Pepper jack" },
      { value: "blue-cheese", label: "Blue cheese" },
      { value: "feta", label: "Feta" },
      { value: "mozzarella", label: "Mozzarella" },
    ],
  },
  {
    id: "dressings",
    label: "Dressings",
    required: true,
    maxSelections: 2,
    options: [
      { value: "ranch", label: "Ranch" },
      { value: "blue-cheese-dressing", label: "Blue cheese" },
      { value: "thousand-island", label: "1000 Island" },
      { value: "vinaigrette", label: "Vinaigrette" },
      { value: "zesty-italian", label: "Zesty Italian" },
      { value: "caesar", label: "Caesar" },
    ],
  },
];

const stirFryGroups: OptionGroup[] = [
  {
    id: "base",
    label: "Choose a base",
    required: true,
    maxSelections: 1,
    options: [
      { value: "brown-rice", label: "Brown rice" },
      { value: "konjac-angel-hair", label: "Konjac angel hair" },
      { value: "konjac-fettuccine", label: "Konjac fettuccine" },
      { value: "konjac-spaghetti", label: "Konjac spaghetti" },
      { value: "konjac-rice", label: "Konjac rice" },
    ],
  },
  {
    id: "flavor",
    label: "Pick a flavor",
    required: true,
    maxSelections: 1,
    options: [
      { value: "cajun", label: "Cajun" },
      { value: "teriyaki", label: "Teriyaki" },
      { value: "garlic-onion", label: "Garlic & onion" },
      { value: "lemon-pepper", label: "Lemon pepper" },
      { value: "salt-pepper", label: "Salt & pepper" },
      { value: "ranch", label: "Ranch" },
    ],
  },
  {
    id: "vegetables",
    label: "Add vegetables",
    help: "Open the vegetable bar",
    options: vegetables.filter((option) => option.value !== "avocado"),
  },
  {
    id: "protein",
    label: "Add protein",
    maxSelections: 1,
    options: [{ value: "chicken", label: "Grilled chicken", priceCents: 200 }],
  },
];

const smoothieGroups: OptionGroup[] = [
  {
    id: "smoothie-fruits",
    label: "Fruit bar",
    help: "Pick any fruits you want blended in",
    options: fruits,
  },
  {
    id: "smoothie-vegetables",
    label: "Vegetable bar",
    help: "Add any vegetables that sound good",
    options: vegetables.map((option) => ({ ...option, priceCents: undefined })),
  },
];

export const menuItems: MenuItem[] = [
  {
    id: "build-your-own-salad",
    name: "Build Your Own Salad",
    description: "Start with the greens and build it from the salad bar.",
    priceCents: 750,
    category: "Custom Favorites",
    featured: true,
    optionGroups: saladGroups,
    builderTone: "ocean",
    menuNote: "Greens, vegetables, fruits, proteins, cheeses, crunch and dressing.",
  },
  {
    id: "custom-stir-fry",
    name: "Custom Stir Fry",
    description: "Choose a base, vegetables and one of six seasonings.",
    priceCents: 850,
    category: "Custom Favorites",
    featured: true,
    optionGroups: stirFryGroups,
    builderTone: "leaf",
    menuNote: "Choose a base and flavor, then open the vegetable bar.",
  },
  {
    id: "chicken-soft-tacos",
    name: "Chicken Soft Tacos",
    priceCents: 750,
    category: "Entrées",
  },
  {
    id: "hamburger-soft-tacos",
    name: "Hamburger Soft Tacos",
    priceCents: 500,
    category: "Entrées",
  },
  {
    id: "hamburger",
    name: "Hamburger",
    description: "Made with 93% lean beef.",
    priceCents: 500,
    category: "Entrées",
  },
  {
    id: "chicken-sandwich",
    name: "Chicken Sandwich",
    description: "Grilled chicken, never deep-fried.",
    priceCents: 700,
    category: "Entrées",
  },
  {
    id: "chicken-bacon-ranch-wrap",
    name: "Chicken Bacon Ranch Wrap",
    description: "Grilled chicken with air-fried bacon.",
    priceCents: 750,
    category: "Entrées",
  },
  { id: "caesar-salad", name: "Caesar Salad", priceCents: 500, category: "Salads" },
  { id: "chef-salad", name: "Chef Salad", priceCents: 700, category: "Salads" },
  { id: "greek-salad", name: "Greek Salad", priceCents: 500, category: "Salads" },
  { id: "cobb-salad", name: "Cobb Salad", priceCents: 500, category: "Salads" },
  {
    id: "cobb-salad-chicken",
    name: "Cobb Salad with Chicken",
    priceCents: 700,
    category: "Salads",
  },
  { id: "broccoli-salad", name: "Broccoli Salad", priceCents: 300, category: "Sides" },
  { id: "tuna-salad", name: "Tuna Salad", priceCents: 300, category: "Sides" },
  { id: "egg-salad", name: "Egg Salad", priceCents: 300, category: "Sides" },
  { id: "cucumber-salad", name: "Cucumber Salad", priceCents: 300, category: "Sides" },
  {
    id: "celery-peanut-butter",
    name: "Celery with Peanut Butter",
    priceCents: 300,
    category: "Sides",
  },
  { id: "cottage-cheese", name: "Cottage Cheese", priceCents: 300, category: "Sides" },
  {
    id: "cottage-cheese-fruit",
    name: "Cottage Cheese with Fruit",
    priceCents: 500,
    category: "Sides",
  },
  { id: "sweet-salty", name: "Sweet & Salty", priceCents: 100, category: "Sides" },
  { id: "fruit-side", name: "Fresh Fruit", priceCents: 100, category: "Sides" },
  { id: "peanuts", name: "Peanuts", priceCents: 100, category: "Sides" },
  {
    id: "honey-roasted-peanuts",
    name: "Honey Roasted Peanuts",
    priceCents: 100,
    category: "Sides",
  },
  { id: "cashews", name: "Cashews", priceCents: 100, category: "Sides" },
  { id: "fruit-cup", name: "Fruit Cup", priceCents: 200, category: "Sides" },
  { id: "tea", name: "Tea", priceCents: 100, category: "Drinks" },
  { id: "coffee", name: "Coffee", priceCents: 100, category: "Drinks" },
  {
    id: "custom-smoothie",
    name: "Build Your Own Smoothie",
    description: "Blend a custom smoothie from the fruit and vegetable bar.",
    priceCents: 500,
    category: "Drinks",
    featured: true,
    optionGroups: smoothieGroups,
    requiredAnyGroupIds: ["smoothie-fruits", "smoothie-vegetables"],
    builderTone: "mango",
    menuNote: "Open the fruit and vegetable drawers online and choose what goes in.",
  },
  { id: "water", name: "Bottled Water", priceCents: 100, category: "Drinks" },
  { id: "slushy", name: "Slushy", priceCents: 300, category: "Drinks" },
];

export const menuById = new Map(menuItems.map((item) => [item.id, item]));

export const menuCategories: MenuCategory[] = [
  "Custom Favorites",
  "Entrées",
  "Salads",
  "Sides",
  "Drinks",
];

export const fallbackCatalog: MenuCatalog = {
  source: "fallback",
  categories: menuCategories,
  updatedAt: "fallback",
  items: menuItems.map((item) => ({
    ...item,
    slug: item.slug ?? item.id,
    available: true,
    variations: [
      {
        id: `${item.id}-regular`,
        name: "Regular",
        priceCents: item.priceCents,
        available: true,
      },
    ],
  })),
};

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function itemPriceLabel(item: MenuItem) {
  const prices = (item.variations?.length ? item.variations : [{ priceCents: item.priceCents }])
    .filter((variation) => !("available" in variation) || variation.available)
    .map((variation) => variation.priceCents);
  if (!prices.length) return "Unavailable";
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? formatMoney(low) : `${formatMoney(low)}–${formatMoney(high)}`;
}

export type SelectionInput = {
  groupId: string;
  value: string;
};

export type PricedMenuItem = {
  item: MenuItem;
  variation: MenuVariation;
  totalCents: number;
  selectionLabels: string[];
  squareModifierIds: string[];
};

export function priceMenuItemFromCatalog(
  catalog: MenuCatalog,
  itemId: string,
  variationId?: string,
  selections: SelectionInput[] = [],
): PricedMenuItem {
  const item = catalog.items.find((candidate) => candidate.id === itemId);
  if (!item || item.available === false) throw new Error("That menu item is no longer available.");

  const variations = item.variations?.length
    ? item.variations
    : [
        {
          id: `${item.id}-regular`,
          name: "Regular",
          priceCents: item.priceCents,
          available: true,
        },
      ];
  const variation = variationId
    ? variations.find((candidate) => candidate.id === variationId)
    : variations.find((candidate) => candidate.available);
  if (!variation || !variation.available) {
    throw new Error("That size or option is currently unavailable.");
  }

  const groups = item.optionGroups ?? [];
  const selectionLabels: string[] = [];
  const squareModifierIds: string[] = [];
  let totalCents = variation.priceCents;

  const groupedSelections = new Map<string, string[]>();
  for (const selection of selections) {
    const current = groupedSelections.get(selection.groupId) ?? [];
    if (!current.includes(selection.value)) current.push(selection.value);
    groupedSelections.set(selection.groupId, current);
  }

  if (item.requiredAnyGroupIds?.length) {
    const hasAtLeastOne = item.requiredAnyGroupIds.some(
      (groupId) => (groupedSelections.get(groupId) ?? []).length > 0,
    );
    if (!hasAtLeastOne) throw new Error("Choose at least one ingredient.");
  }

  for (const group of groups) {
    const selectedValues = groupedSelections.get(group.id) ?? [];
    const minimum = group.minSelections ?? (group.required ? 1 : 0);

    if (selectedValues.length < minimum) {
      throw new Error(`Please choose ${group.label.toLowerCase()}.`);
    }
    if (group.maxSelections && selectedValues.length > group.maxSelections) {
      throw new Error(`Too many choices selected for ${group.label.toLowerCase()}.`);
    }

    for (const value of selectedValues) {
      const option = group.options.find((candidate) => candidate.value === value);
      if (!option || option.available === false) {
        throw new Error("One of those choices is no longer available. Refresh and try again.");
      }
      totalCents += option.priceCents ?? 0;
      selectionLabels.push(`${group.label}: ${option.label}`);
      if (option.squareModifierId) squareModifierIds.push(option.squareModifierId);
    }
  }

  for (const groupId of groupedSelections.keys()) {
    if (!groups.some((group) => group.id === groupId)) {
      throw new Error("Invalid menu option group.");
    }
  }

  return { item, variation, totalCents, selectionLabels, squareModifierIds };
}

// Backward-compatible helper for the local fallback menu.
export function priceMenuItem(itemId: string, selections: SelectionInput[] = []) {
  return priceMenuItemFromCatalog(fallbackCatalog, itemId, undefined, selections);
}
