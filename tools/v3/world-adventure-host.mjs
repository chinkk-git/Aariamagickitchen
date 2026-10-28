/**
 * W02-owned, presentation-free boundary for the W03 globe module.
 * It exposes verified recipe data and host callbacks without rendering globe
 * visuals or owning module animation/selection state.
 */
export const WORLD_ADVENTURE_INDIA_RECIPE_IDS = Object.freeze([
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 69, 72, 74
]);

// Shared V3.5 country catalogue. This is also consumed by the Home cards and
// the review globe, so both routes resolve the same canonical recipe IDs.
export const V35_COUNTRY_RECIPE_IDS = Object.freeze({
  IND: WORLD_ADVENTURE_INDIA_RECIPE_IDS,
  ITA: Object.freeze([96, 97, 98]),
  CHN: Object.freeze([99, 100, 101]),
  JPN: Object.freeze([102, 103, 104]),
  MEX: Object.freeze([105, 106, 107]),
  VNM: Object.freeze([108, 109, 110, 111, 112, 113, 114, 115, 116]),
  BRA: Object.freeze([]),
  USA: Object.freeze([]),
  FRA: Object.freeze([]),
  ESP: Object.freeze([]),
  THA: Object.freeze([]),
  GBR: Object.freeze([]),
  MAR: Object.freeze([])
});

const COUNTRY_LABELS = Object.freeze({
  IND: Object.freeze({ 'en-GB': 'India', 'pt-BR': 'Índia', flag: '🇮🇳' }),
  ITA: Object.freeze({ 'en-GB': 'Italy', 'pt-BR': 'Itália', flag: '🇮🇹' }),
  CHN: Object.freeze({ 'en-GB': 'China', 'pt-BR': 'China', flag: '🇨🇳' }),
  JPN: Object.freeze({ 'en-GB': 'Japan', 'pt-BR': 'Japão', flag: '🇯🇵' }),
  MEX: Object.freeze({ 'en-GB': 'Mexico', 'pt-BR': 'México', flag: '🇲🇽' }),
  VNM: Object.freeze({ 'en-GB': 'Vietnam', 'pt-BR': 'Vietnã', flag: '🇻🇳' }),
  BRA: Object.freeze({ 'en-GB': 'Brazil', 'pt-BR': 'Brasil', flag: '🇧🇷' }),
  USA: Object.freeze({ 'en-GB': 'United States', 'pt-BR': 'Estados Unidos', flag: '🇺🇸' }),
  FRA: Object.freeze({ 'en-GB': 'France', 'pt-BR': 'França', flag: '🇫🇷' }),
  ESP: Object.freeze({ 'en-GB': 'Spain', 'pt-BR': 'Espanha', flag: '🇪🇸' }),
  THA: Object.freeze({ 'en-GB': 'Thailand', 'pt-BR': 'Tailândia', flag: '🇹🇭' }),
  GBR: Object.freeze({ 'en-GB': 'United Kingdom', 'pt-BR': 'Reino Unido', flag: '🇬🇧' }),
  MAR: Object.freeze({ 'en-GB': 'Morocco', 'pt-BR': 'Marrocos', flag: '🇲🇦' })
});

const WORLD_COUNTRY_ALIASES = Object.freeze({
  IND: 'IND', INDIA: 'IND', ITA: 'ITA', ITALY: 'ITA', CHN: 'CHN', CHINA: 'CHN',
  JPN: 'JPN', JAPAN: 'JPN', MEX: 'MEX', MEXICO: 'MEX', VNM: 'VNM', VIETNAM: 'VNM',
  BRA: 'BRA', BRAZIL: 'BRA', USA: 'USA', 'UNITED STATES': 'USA', FRA: 'FRA', FRANCE: 'FRA',
  ESP: 'ESP', SPAIN: 'ESP', THA: 'THA', THAILAND: 'THA', GBR: 'GBR', 'UNITED KINGDOM': 'GBR',
  MAR: 'MAR', MOROCCO: 'MAR'
});

function validInternationalRecord(recipe) {
  const approval = recipe?.worldAdventure;
  return recipe?.active !== false && approval &&
    approval.validationStatus === 'W01_VALIDATED' &&
    approval.bilingualStatus === 'APPROVED' &&
    approval.artworkStatus === 'APPROVED' &&
    approval.safetyStatus === 'APPROVED' &&
    approval.navigationStatus === 'ACTIVE' &&
    Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 &&
    Array.isArray(recipe.steps) && recipe.steps.length > 0 &&
    typeof recipe.title === 'string' && recipe.title.trim().length > 0;
}

function localized(value, locale) {
  if (typeof value === 'string') return value;
  if (value && typeof value[locale] === 'string') return value[locale];
  return '';
}

function immutableRecipeDescriptor(recipe, locale, country, getLocalizedRecipe) {
  const copy = typeof getLocalizedRecipe === 'function' ? getLocalizedRecipe(recipe, locale) : null;
  return Object.freeze({
    id: Number(recipe.id),
    country,
    title: localized(copy?.title ?? recipe.title, locale),
    description: localized(copy?.description ?? recipe.description, locale),
    canonical: true,
    finishedDish: typeof copy?.finishedDish === 'string' ? copy.finishedDish : ''
  });
}

/**
 * Creates W03's host context from the existing canonical catalogue.
 * `onOpenRecipe`, `onBack` and `onOpenPassport` are app-owned navigation
 * callbacks. Passport information is a read-only snapshot; stamps are never
 * granted by this adapter or by viewing a country.
 */
export function createWorldAdventureHost({
  canonicalRecipes,
  countryRecipeIds = V35_COUNTRY_RECIPE_IDS,
  locale = 'en-GB',
  passportSnapshot = {},
  getLocalizedRecipe,
  onOpenRecipe,
  onBack,
  onOpenPassport
} = {}) {
  if (!['en-GB', 'pt-BR'].includes(locale)) throw new TypeError('World Adventure locale must be en-GB or pt-BR');
  if (!Array.isArray(canonicalRecipes)) throw new TypeError('canonicalRecipes must be the existing canonical catalogue');
  if (canonicalRecipes.length < 95) throw new TypeError('canonicalRecipes must contain the unchanged 95-recipe base');
  if (typeof onOpenRecipe !== 'function' || typeof onBack !== 'function' || typeof onOpenPassport !== 'function') {
    throw new TypeError('World Adventure host navigation callbacks are required');
  }

  const byId = new Map();
  for (const recipe of canonicalRecipes) {
    const id = Number(recipe?.id);
    if (!Number.isSafeInteger(id) || id < 1 || byId.has(id)) {
      throw new TypeError('canonicalRecipes must preserve unique positive IDs');
    }
    byId.set(id, recipe);
  }
  for (let id = 1; id <= 95; id++) if (!byId.has(id)) {
    throw new TypeError('canonicalRecipes must preserve every original ID 1–95');
  }
  const countryEntries = new Map();
  const mappedIds = new Set();
  for (const [rawCode, ids] of Object.entries(countryRecipeIds || {})) {
    const code = WORLD_COUNTRY_ALIASES[String(rawCode).toUpperCase()];
    if (!code || !Array.isArray(ids)) throw new TypeError('V3.5 country mapping contains an invalid country or ID list');
    const descriptors = ids.map(rawId => {
      const id = Number(rawId), recipe = byId.get(id);
      if (!Number.isSafeInteger(id) || !recipe || mappedIds.has(id)) throw new TypeError('V3.5 country mapping must use existing, unique recipe IDs');
      mappedIds.add(id);
      if (code !== 'IND' && id <= 95) throw new TypeError('International V3.5 mappings may not replace the original 95-recipe base');
      return immutableRecipeDescriptor(recipe, locale, code, getLocalizedRecipe);
    });
    countryEntries.set(code, descriptors);
  }
  const indiaHasFullMapping = (countryEntries.get('IND') || []).length === WORLD_ADVENTURE_INDIA_RECIPE_IDS.length;
  const savedStamps = Array.isArray(passportSnapshot.worldStamps)
    ? [...new Set(passportSnapshot.worldStamps.filter(code => code === 'IND' && indiaHasFullMapping))]
    : [];

  function country(code) {
    const key = String(code || '').toUpperCase();
    const labels = COUNTRY_LABELS[key];
    if (!labels) return Object.freeze({ code: key, available: false, label: '', recipes: Object.freeze([]) });
    const recipes = countryEntries.get(key) || [];
    const available = recipes.length > 0;
    return Object.freeze({
      code: key,
      available,
      reviewOnly: available && key !== 'IND',
      label: labels[locale],
      flag: labels.flag,
      recipes: Object.freeze([...recipes])
    });
  }

  return Object.freeze({
    contractVersion: 1,
    locale,
    countries: Object.freeze(Object.keys(COUNTRY_LABELS)),
    getCountry: country,
    openRecipe(recipeId) {
      const id = Number(recipeId);
      const recipe = byId.get(id);
      const indiaApproved = WORLD_ADVENTURE_INDIA_RECIPE_IDS.includes(id) && indiaHasFullMapping;
      const countryCode = WORLD_COUNTRY_ALIASES[String(recipe?.worldAdventure?.countryCode || '').toUpperCase()];
      const internationalApproved = Number.isSafeInteger(id) && id > 95 && validInternationalRecord(recipe) &&
        Boolean(countryCode && countryCode !== 'IND' && COUNTRY_LABELS[countryCode]);
      const mappedForReview = [...countryEntries.values()].some(recipes => recipes.some(item => item.id === id));
      if (!indiaApproved && !internationalApproved && !mappedForReview) return false;
      return onOpenRecipe(id) !== false;
    },
    back(scope = 'screen') {
      if (!['screen', 'country', 'passport'].includes(scope)) throw new TypeError('Unknown Back scope');
      return onBack(scope);
    },
    openPassport() {
      return onOpenPassport();
    },
    getPassportSnapshot() {
      return Object.freeze({ stamps: Object.freeze([...savedStamps]) });
    }
  });
}
