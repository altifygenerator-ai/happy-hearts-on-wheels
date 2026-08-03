import { unstable_cache } from "next/cache";
import {
  fallbackCatalog,
  type MenuCatalog,
  type MenuItem,
  type MenuOption,
  type MenuVariation,
  type OptionGroup,
} from "@/lib/menu";

export const SQUARE_CATALOG_CACHE_TAG = "happy-hearts-square-catalog";
const DEFAULT_SQUARE_API_VERSION = "2026-07-15";

export function squareCatalogConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

function squareBaseUrl() {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

type Money = { amount?: number; currency?: string };
type LocationOverride = {
  location_id?: string;
  price_money?: Money;
  sold_out?: boolean;
  sold_out_valid_until?: string;
};

type SquareCatalogObject = {
  type?: string;
  id?: string;
  updated_at?: string;
  version?: number;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  category_data?: {
    name?: string;
    ordinal?: number;
  };
  item_data?: {
    name?: string;
    description?: string;
    abbreviation?: string;
    category_id?: string;
    categories?: Array<{ id?: string; ordinal?: number }>;
    tax_ids?: string[];
    variations?: SquareCatalogObject[];
    modifier_list_info?: Array<{
      modifier_list_id?: string;
      enabled?: boolean;
      min_selected_modifiers?: number;
      max_selected_modifiers?: number;
      modifier_overrides?: Array<{
        modifier_id?: string;
        on_by_default?: boolean;
        on_by_default_override?: "YES" | "NO" | "NOT_SET";
        hidden_online_override?: "YES" | "NO" | "NOT_SET";
      }>;
    }>;
    available_online?: boolean;
    is_archived?: boolean;
    product_type?: string;
  };
  item_variation_data?: {
    item_id?: string;
    name?: string;
    ordinal?: number;
    pricing_type?: string;
    price_money?: Money;
    location_overrides?: LocationOverride[];
    sellable?: boolean;
  };
  modifier_list_data?: {
    name?: string;
    ordinal?: number;
    selection_type?: string;
    modifier_type?: string;
    min_selected_modifiers?: number;
    max_selected_modifiers?: number;
    modifiers?: SquareCatalogObject[];
  };
  modifier_data?: {
    name?: string;
    ordinal?: number;
    price_money?: Money;
    on_by_default?: boolean;
    modifier_list_id?: string;
    location_overrides?: LocationOverride[];
    hidden_online?: boolean;
  };
};

type SquareListCatalogResponse = {
  objects?: SquareCatalogObject[];
  cursor?: string;
  errors?: Array<{ detail?: string; code?: string }>;
};

function objectIsAtLocation(object: SquareCatalogObject, locationId: string) {
  if (object.absent_at_location_ids?.includes(locationId)) return false;
  if (object.present_at_all_locations === true) return true;
  if (object.present_at_location_ids?.length) {
    return object.present_at_location_ids.includes(locationId);
  }
  return true;
}

function soldOutAtLocation(overrides: LocationOverride[] | undefined, locationId: string) {
  const override = overrides?.find((candidate) => candidate.location_id === locationId);
  if (!override?.sold_out) return false;
  if (!override.sold_out_valid_until) return true;
  const until = Date.parse(override.sold_out_valid_until);
  return Number.isNaN(until) || until > Date.now();
}

function moneyAmount(money: Money | undefined) {
  if (!money || money.currency && money.currency !== "USD") return null;
  return Number.isInteger(money.amount) ? Number(money.amount) : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "menu-item";
}

function knownSlug(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("salad") && (normalized.includes("build") || normalized.includes("custom"))) {
    return "build-your-own-salad";
  }
  if (normalized.includes("stir") && normalized.includes("fry")) return "custom-stir-fry";
  if (normalized.includes("smoothie") && (normalized.includes("build") || normalized.includes("custom"))) {
    return "custom-smoothie";
  }
  return slugify(name);
}

function builderTone(name: string): MenuItem["builderTone"] {
  const normalized = name.toLowerCase();
  if (normalized.includes("smoothie")) return "mango";
  if (normalized.includes("stir") && normalized.includes("fry")) return "leaf";
  return "ocean";
}

function modifierHelp(min: number, max: number | undefined) {
  if (min > 0 && max === 1) return "Choose one";
  if (min > 0 && max) return `Choose ${min}–${max}`;
  if (max === 1) return "Choose up to one";
  if (max) return `Choose up to ${max}`;
  return "Choose any that sound good";
}

async function squareRequest<T>(path: string): Promise<T> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Square access token is missing.");

  const response = await fetch(`${squareBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": process.env.SQUARE_API_VERSION || DEFAULT_SQUARE_API_VERSION,
    },
    cache: "no-store",
  });
  const result = (await response.json()) as T & { errors?: Array<{ detail?: string; code?: string }> };
  if (!response.ok) {
    const detail = result.errors?.map((error) => error.detail || error.code).filter(Boolean).join(" ");
    throw new Error(detail || `Square catalog request failed with status ${response.status}.`);
  }
  return result;
}

async function listSquareCatalogObjects() {
  const objects: SquareCatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ types: "ITEM,MODIFIER_LIST,CATEGORY" });
    if (cursor) params.set("cursor", cursor);
    const result = await squareRequest<SquareListCatalogResponse>(`/v2/catalog/list?${params}`);
    objects.push(...(result.objects ?? []));
    cursor = result.cursor;
  } while (cursor);

  return objects;
}

export async function loadSquareCatalog(): Promise<MenuCatalog> {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error("Square location ID is missing.");

  const objects = await listSquareCatalogObjects();
  const categories = new Map<string, { name: string; ordinal: number }>();
  const modifierLists = new Map<string, SquareCatalogObject>();

  for (const object of objects) {
    if (!object.id || object.is_deleted) continue;
    if (object.type === "CATEGORY" && object.category_data?.name) {
      categories.set(object.id, {
        name: object.category_data.name.trim(),
        ordinal: object.category_data.ordinal ?? Number.MAX_SAFE_INTEGER,
      });
    }
    if (object.type === "MODIFIER_LIST") modifierLists.set(object.id, object);
  }

  const items: MenuItem[] = [];
  const usedSlugs = new Set<string>();

  for (const object of objects) {
    if (
      object.type !== "ITEM" ||
      !object.id ||
      object.is_deleted ||
      !object.item_data?.name ||
      object.item_data.is_archived ||
      object.item_data.available_online === false ||
      !objectIsAtLocation(object, locationId)
    ) {
      continue;
    }

    const itemData = object.item_data;
    const itemName = itemData.name!.trim();
    const parsedVariations: Array<MenuVariation & { ordinal: number }> = [];

    for (const variation of itemData.variations ?? []) {
      const data = variation.item_variation_data;
      if (
        !variation.id ||
        variation.is_deleted ||
        !objectIsAtLocation(variation, locationId) ||
        !data ||
        data.sellable === false ||
        soldOutAtLocation(data.location_overrides, locationId)
      ) {
        continue;
      }

      const locationPrice = data.location_overrides?.find(
        (candidate) => candidate.location_id === locationId,
      )?.price_money;
      const priceCents = moneyAmount(locationPrice) ?? moneyAmount(data.price_money);
      if (priceCents === null) continue;

      parsedVariations.push({
        id: variation.id,
        squareVariationId: variation.id,
        name: data.name?.trim() || "Regular",
        priceCents,
        available: true,
        ordinal: data.ordinal ?? Number.MAX_SAFE_INTEGER,
      });
    }

    const variations: MenuVariation[] = parsedVariations
      .sort((a, b) => a.ordinal - b.ordinal || a.name.localeCompare(b.name))
      .map(({ ordinal: _ordinal, ...variation }) => variation);

    if (!variations.length) continue;

    const optionGroups: OptionGroup[] = [];
    let requiredGroupUnavailable = false;

    for (const info of itemData.modifier_list_info ?? []) {
      if (!info.modifier_list_id || info.enabled === false) continue;
      const list = modifierLists.get(info.modifier_list_id);
      const listData = list?.modifier_list_data;
      if (!list || !listData?.name || !objectIsAtLocation(list, locationId)) continue;

      const overrideById = new Map(
        (info.modifier_overrides ?? [])
          .filter((entry) => entry.modifier_id)
          .map((entry) => [entry.modifier_id!, entry]),
      );

      const options: Array<MenuOption & { ordinal: number }> = (listData.modifiers ?? [])
        .filter((modifier) => {
          const data = modifier.modifier_data;
          const override = modifier.id ? overrideById.get(modifier.id) : undefined;
          const hiddenOnline =
            override?.hidden_online_override === "YES" ||
            (override?.hidden_online_override !== "NO" && data?.hidden_online === true);
          return Boolean(
            modifier.id &&
              !modifier.is_deleted &&
              objectIsAtLocation(modifier, locationId) &&
              data?.name &&
              !hiddenOnline &&
              !soldOutAtLocation(data.location_overrides, locationId),
          );
        })
        .map((modifier) => {
          const data = modifier.modifier_data!;
          const locationPrice = data.location_overrides?.find(
            (candidate) => candidate.location_id === locationId,
          )?.price_money;
          const priceCents = moneyAmount(locationPrice) ?? moneyAmount(data.price_money) ?? 0;
          const override = overrideById.get(modifier.id!);
          const defaultSelected =
            override?.on_by_default_override === "YES"
              ? true
              : override?.on_by_default_override === "NO"
                ? false
                : override?.on_by_default ?? data.on_by_default ?? false;
          return {
            value: modifier.id!,
            squareModifierId: modifier.id!,
            label: data.name!.trim(),
            priceCents: priceCents || undefined,
            available: true,
            defaultSelected,
            ordinal: data.ordinal ?? Number.MAX_SAFE_INTEGER,
          };
        })
        .sort((a, b) => a.ordinal - b.ordinal || a.label.localeCompare(b.label));

      const itemMin = info.min_selected_modifiers;
      const listMin = listData.min_selected_modifiers;
      const effectiveMin = itemMin === undefined || itemMin === -1 ? listMin : itemMin;
      const minSelections = effectiveMin && effectiveMin > 0 ? effectiveMin : 0;

      const itemMax = info.max_selected_modifiers;
      const listMax = listData.max_selected_modifiers;
      const effectiveMax = itemMax === undefined || itemMax === -1 ? listMax : itemMax;
      const maxSelections =
        effectiveMax && effectiveMax > 0
          ? effectiveMax
          : listData.selection_type === "SINGLE"
            ? 1
            : undefined;

      if (minSelections > options.length) {
        requiredGroupUnavailable = true;
        break;
      }
      if (!options.length) continue;

      optionGroups.push({
        id: list.id!,
        squareModifierListId: list.id!,
        label: listData.name.trim(),
        help: modifierHelp(minSelections, maxSelections),
        required: minSelections > 0,
        minSelections,
        maxSelections,
        options: options.map(({ ordinal: _ordinal, ...option }) => option),
      });
    }

    if (requiredGroupUnavailable) continue;

    const categoryReference = [...(itemData.categories ?? [])]
      .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
      .find((entry) => typeof entry.id === "string" && categories.has(entry.id));
    const categoryId = categoryReference?.id || itemData.category_id;
    const category = (categoryId && categories.get(categoryId)?.name) || "Menu";

    let slug = knownSlug(itemName);
    if (usedSlugs.has(slug)) slug = `${slug}-${object.id.slice(-6).toLowerCase()}`;
    usedSlugs.add(slug);

    const priceCents = Math.min(...variations.map((variation) => variation.priceCents));
    const hasModifiers = optionGroups.length > 0;

    items.push({
      id: object.id,
      squareItemId: object.id,
      slug,
      name: itemName,
      description: itemData.description?.trim() || undefined,
      category,
      priceCents,
      available: true,
      variations,
      optionGroups: hasModifiers ? optionGroups : undefined,
      featured: hasModifiers,
      builderTone: hasModifiers ? builderTone(itemName) : undefined,
      menuNote: hasModifiers
        ? optionGroups.map((group) => group.label).join(", ")
        : undefined,
    });
  }

  const preferred = ["Custom Favorites", "Entrées", "Salads", "Sides", "Drinks"];
  const activeCategories = [...new Set(items.map((item) => item.category))];
  activeCategories.sort((a, b) => {
    const preferredA = preferred.indexOf(a);
    const preferredB = preferred.indexOf(b);
    if (preferredA !== -1 || preferredB !== -1) {
      if (preferredA === -1) return 1;
      if (preferredB === -1) return -1;
      return preferredA - preferredB;
    }
    const categoryA = [...categories.values()].find((candidate) => candidate.name === a);
    const categoryB = [...categories.values()].find((candidate) => candidate.name === b);
    return (categoryA?.ordinal ?? Number.MAX_SAFE_INTEGER) -
      (categoryB?.ordinal ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b);
  });

  items.sort((a, b) => {
    const categoryDifference = activeCategories.indexOf(a.category) - activeCategories.indexOf(b.category);
    return categoryDifference || a.name.localeCompare(b.name);
  });

  if (!items.length) {
    throw new Error(
      "Square is connected, but no fixed-price items are available online at the selected location.",
    );
  }

  const updatedAt = objects
    .map((object) => object.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) || new Date().toISOString();

  return { source: "square", items, categories: activeCategories, updatedAt };
}

const getCachedSquareCatalog = unstable_cache(
  loadSquareCatalog,
  ["happy-hearts-square-catalog-v3"],
  { revalidate: 60, tags: [SQUARE_CATALOG_CACHE_TAG] },
);

export async function getMenuCatalog(): Promise<MenuCatalog> {
  if (!squareCatalogConfigured()) return fallbackCatalog;
  try {
    return await getCachedSquareCatalog();
  } catch (error) {
    console.error("Square catalog display fallback", error);
    return {
      ...fallbackCatalog,
      warning: "The live Square menu could not be loaded. Online checkout will stay disabled until it reconnects.",
    };
  }
}

export async function getCheckoutCatalog(): Promise<MenuCatalog> {
  if (!squareCatalogConfigured()) return fallbackCatalog;
  try {
    return await loadSquareCatalog();
  } catch (error) {
    console.error("Square live catalog validation failed", error);
    throw new Error(
      "The live Square menu could not be checked. Please refresh in a moment or call 501-613-1513.",
    );
  }
}
