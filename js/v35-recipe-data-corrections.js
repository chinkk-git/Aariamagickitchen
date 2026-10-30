/* Narrow V3.5 content corrections for the packaged review build. */
(() => {
  'use strict';

  // Some legacy recipes do not have a per-recipe PT_RECIPES row. The original
  // search filter dereferenced those rows and threw while listing recipes.
  if (typeof recipeMatchesSearch === 'function') {
    recipeMatchesSearch = function v35SafeRecipeMatchesSearch(recipe, query) {
      const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const translated = PT_RECIPES?.[recipe.id] || {};
      const text = [
        recipe.title,
        ...(recipe.ingredients || []),
        recipe.method,
        translated.title,
        ...(translated.ingredients || [])
      ].filter(Boolean).join(' ');
      return fold(text).includes(fold(query));
    };
  }

  if (typeof V32_INTL_BY_ID === 'undefined' || typeof v32InternationalIngredientList !== 'function') {
    throw new Error('V3.5 international recipe data is not available for corrections.');
  }

  function updateIngredient(id, locale, oldName, oldQuantity, oldUnit, next) {
    const entry = V32_INTL_BY_ID.get(id);
    const ingredients = entry?.item?.locales?.[locale]?.ingredients;
    const ingredient = ingredients?.find(item => item.name === oldName);
    if (!ingredient || ingredient.quantity !== oldQuantity || ingredient.unit !== oldUnit) {
      throw new Error(`Unexpected source data for recipe ${id} (${locale}); correction was not applied.`);
    }
    Object.assign(ingredient, next);
    return entry;
  }

  for (const id of [111, 112, 113]) {
    const en = updateIngredient(id, 'en-GB', 'ime', '1', 'L', {
      name: 'lime', quantity: '1', unit: ''
    });
    const pt = updateIngredient(id, 'pt-BR', 'imão', '1', 'L', {
      name: 'limão', quantity: '1', unit: ''
    });
    en.record.ingredients = v32InternationalIngredientList(en.item.locales['en-GB']);
    if (typeof PT_RECIPES !== 'undefined' && PT_RECIPES[id]) {
      PT_RECIPES[id].ingredients = v32InternationalIngredientList(pt.item.locales['pt-BR']);
    }
  }

  const garlic = updateIngredient(115, 'en-GB', 'arlic clove', '1', 'g', {
    name: 'garlic clove', quantity: '1', unit: ''
  });
  garlic.record.ingredients = v32InternationalIngredientList(garlic.item.locales['en-GB']);

  if (typeof recipeAllergens === 'function') {
    const previousRecipeAllergens = recipeAllergens;
    recipeAllergens = function correctedInternationalAllergens(recipe) {
      if (Number(recipe?.id) !== 116) return previousRecipeAllergens(recipe);

      // The packaged declaration says “wheat/gluten” and “oats; possible
      // gluten cross-contact”. Report the specific oat warning and avoid
      // mislabelling oat flour as wheat. Keep the declared coconut warning.
      const declared = Array.isArray(recipe.declaredAllergens) ? recipe.declaredAllergens : [];
      const safeRecipe = {
        ...recipe,
        declaredAllergens: declared.filter(value => !/^wheat\/gluten$/i.test(String(value).trim()))
      };
      const result = previousRecipeAllergens(safeRecipe);
      const pt = typeof state !== 'undefined' && state.language === 'pt-BR';
      const ingredients = V32_INTL_BY_ID.get(116)?.item?.locales?.[pt ? 'pt-BR' : 'en-GB']?.ingredients || [];
      const oat = ingredients.find(item => /oat|aveia/i.test(item.name));
      const coconut = ingredients.find(item => /coconut|coco/i.test(item.name));
      result.confirmed = (result.confirmed || []).filter(item => item.name !== 'Wheat');

      const add = (name, ingredient, aliases = []) => {
        if (!ingredient) return;
        const existing = result.confirmed.find(item => [name, ...aliases].includes(item.name));
        if (existing) {
          existing.name = name;
          existing.ingredients = [ingredient.name];
        }
        else result.confirmed.push({ name, ingredients: [ingredient.name] });
      };
      const oatsLabel = pt ? 'Aveia (possível contato cruzado com glúten)' : 'Oats (possible gluten cross-contact)';
      const coconutLabel = pt ? 'Coco' : 'Coconut';
      add(oatsLabel, oat, [pt ? 'Oats (possible gluten cross-contact)' : 'Aveia (possível contato cruzado com glúten)', 'Oats', 'Aveia']);
      add(coconutLabel, coconut, [pt ? 'Coconut' : 'Coco']);
      return result;
    };
  }
})();
