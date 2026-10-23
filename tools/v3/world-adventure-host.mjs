/**
 * W02-owned, presentation-free boundary for the W03 globe module.
 * It exposes verified recipe data and host callbacks without rendering globe
 * visuals or owning module animation/selection state.
 */
export const WORLD_ADVENTURE_INDIA_RECIPE_IDS = Object.freeze([
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 69, 72, 74
]);

const COUNTRY_LABELS = Object.freeze({
  IND: Object.freeze({ 'en-GB': 'India', 'pt-BR': 'Índia', flag: '🇮🇳' }),
  ITA: Object.freeze({ 'en-GB': 'Italy', 'pt-BR': 'Itália', flag: '🇮🇹' }),
  CHN: Object.freeze({ 'en-GB': 'China', 'pt-BR': 'China', flag: '🇨🇳' }),
  JPN: Object.freeze({ 'en-GB': 'Japan', 'pt-BR': 'Japão', flag: '🇯🇵' }),
  MEX: Object.freeze({ 'en-GB': 'Mexico', 'pt-BR': 'México', flag: '🇲🇽' }),
  VNM: Object.freeze({ 'en-GB': 'Vietnam', 'pt-BR': 'Vietnã', flag: '🇻🇳' })
});

const WORLD_COUNTRY_ALIASES = Object.freeze({
  IND: 'IND', INDIA: 'IND', ITA: 'ITA', ITALY: 'ITA', CHN: 'CHN', CHINA: 'CHN',
  JPN: 'JPN', JAPAN: 'JPN', MEX: 'MEX', MEXICO: 'MEX', VNM: 'VNM', VIETNAM: 'VNM'
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
  const indiaRecipes = WORLD_ADVENTURE_INDIA_RECIPE_IDS
    .map(id => byId.get(id))
    .filter(Boolean)
    .map(recipe => immutableRecipeDescriptor(recipe, locale, 'IND', getLocalizedRecipe));
  const indiaHasFullMapping = indiaRecipes.length === WORLD_ADVENTURE_INDIA_RECIPE_IDS.length;
  const internationalByCountry = new Map();
  for (const recipe of canonicalRecipes) {
    if (Number(recipe.id) <= 95 || !validInternationalRecord(recipe)) continue;
    const approval = recipe.worldAdventure;
    const code = WORLD_COUNTRY_ALIASES[String(approval.countryCode || '').toUpperCase()];
    if (!code || code === 'IND') continue;
    if (!internationalByCountry.has(code)) internationalByCountry.set(code, []);
    internationalByCountry.get(code).push(immutableRecipeDescriptor(recipe, locale, code, getLocalizedRecipe));
  }
  for (const recipes of internationalByCountry.values()) recipes.sort((a, b) => a.id - b.id);
  const savedStamps = Array.isArray(passportSnapshot.worldStamps)
    ? [...new Set(passportSnapshot.worldStamps.filter(code => code === 'IND' || (COUNTRY_LABELS[code] && internationalByCountry.has(code))))]
    : [];

  function country(code) {
    const key = String(code || '').toUpperCase();
    const labels = COUNTRY_LABELS[key];
    if (!labels) return Object.freeze({ code: key, available: false, label: '', recipes: Object.freeze([]) });
    const recipes = key === 'IND' ? (indiaHasFullMapping ? indiaRecipes : []) : (internationalByCountry.get(key) || []);
    const available = recipes.length > 0;
    return Object.freeze({
      code: key,
      available,
      reviewOnly: !available,
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
      if (!indiaApproved && !internationalApproved) return false;
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
