const nutritionKeys = ['kcal','proteinG','carbohydrateG','totalFatG','saturatedFatG','fiberG','sugarG','sodiumMg'];
export function validateRecipe(recipe) {
  const errors=[];
  for (const key of ['id','title','servings','ingredients','equipment','allergens','adultHelp','steps','nutrition','artworkIds','publicationStatus','estimatedHandsOnMinutes','durationStatus']) {
    if (recipe[key] == null || recipe[key] === '') errors.push(`Missing ${key}`);
  }
  if (recipe.servings < 1) errors.push('Servings must be positive');
  if (!recipe.steps?.length) errors.push('At least one step is required');
  if (recipe.steps?.some(s => !s.title || !s.instruction || !s.safety || !s.art)) errors.push('Each step needs instruction, safety and artwork mapping');
  for (const key of nutritionKeys) if (!(recipe.nutrition?.perServing && key in recipe.nutrition.perServing)) errors.push(`Nutrition field missing: ${key}`);
  return errors;
}
export function nutritionIsVerified(recipe) {
  return nutriti