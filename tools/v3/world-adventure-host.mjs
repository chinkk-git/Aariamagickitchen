/**
 * W02-owned, presentation-free boundary for a future W03 globe module.
 * It exposes verified recipe data and host callbacks without rendering globe
 * visuals or owning module animation/selection state.
 */
export const WORLD_ADVENTURE_INDIA_RECIPE_IDS = Object.freeze([
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 69, 72, 74
]);

const COUNTRY_LABELS = Object.freeze({
  IND: Object.freeze({ 'en-GB': 'India', 'pt-BR': 'Índia' }),
  ITA: Object.freeze({ 'en-GB': 'Italy', 'pt-BR': 'Itália' }),
  CHN: Object.freeze({ 'en-GB': 'China', 'pt-BR': 'China' }),
  JPN: Object.freeze({ 'en-GB': 'Japan', 'pt-BR': 'Japão' }),
  MEX: Object.freeze({ 'en-GB': 'Mexico', 'pt-BR': 'México' }),
  VNM: Object.freeze({ 'en-GB': 'Vietnam', 'pt-BR': 'Vietnã' })
});

function localized(value, locale) {
  if (typeof value === 'string') return value;
  if (value && typeof value[locale] === 'string') return value[locale];
  return '';
}

function immutableRecipeDescriptor(recipe, locale) {
  return Object.freeze({
    id: Number(recipe.id),
    country: 'IND',
    title: localized(recipe.title, locale),
    description: localized(recipe.description, locale),
    canonical: true
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
  locale = 'en-GB',
  passportSnapshot = {},
  onOpenRecipe,
  onBack,
  onOpenPassport
} = {}) {
  if (!['en-GB', 'pt-BR'].includes(locale)) throw new TypeError('World Adventure locale must be en-GB or pt-BR');
  if (!Array.isArray(canonicalRecipes)) throw new TypeError('canonicalRecipes must be the existing canonical catalogue');
  if (canonicalRecipes.length !== 95) throw new TypeError('canonicalRecipes must contain the unchanged 95-recipe catalogue');
  if (typeof onOpenRecipe !== 'function' || typeof onBack !== 'function' || typeof onOpenPassport !== 'function') {
    throw new TypeError('World Adventure host navigation callbacks are required');
  }

  const byId = new Map();
  for (const recipe of canonicalRecipes) {
    const id = Number(recipe?.id);
    if (!Number.isSafeInteger(id) || id < 1 || id > 95 || byId.has(id)) {
      throw new TypeError('canonicalRecipes must preserve unique IDs 1–95');
    }
    byId.set(id, recipe);
  }
  const indiaRecipes = WORLD_ADVENTURE_INDIA_RECIPE_IDS
    .map(id => byId.get(id))
    .filter(Boolean)
    .map(recipe => immutableRecipeDescriptor(recipe, locale));
  const indiaHasFullMapping = indiaRecipes.length === WORLD_ADVENTURE_INDIA_RECIPE_IDS.length;
  const savedStamps = Array.isArray(passportSnapshot.worldStamps)
    ? [...new Set(passportSnapshot.worldStamps.filter(code => code === 'IND'))]
    : [];

  function country(code) {
    const key = String(code || '').toUpperCase();
    const labels = COUNTRY_LABELS[key];
    if (!labels) return Object.freeze({ code: key, available: false, label: '', recipes: Object.freeze([]) });
    const available = key === 'IND' && indiaHasFullMapping;
    return Object.freeze({
      code: key,
      available,
      reviewOnly: key !== 'IND',
      label: labels[locale],
      recipes: Object.freeze(available ? [...indiaRecipes] : [])
    });
  }

  return Object.freeze({
    contractVersion: 1,
    locale,
    countries: Object.freeze(Object.keys(COUNTRY_LABELS)),
    getCountry: country,
    openRecipe(recipeId) {
      const id = Number(recipeId);
      if (!indiaHasFullMapping || !WORLD_ADVENTURE_INDIA_RECIPE_IDS.includes(id)) return false;
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
