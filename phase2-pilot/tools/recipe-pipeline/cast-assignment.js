const castByGroup={
  aaria:[
    {name:'Aaria',assetId:'character.aaria.v1'}
  ],
  family:[
    {name:'Aaria',assetId:'character.aaria.v1'},
    {name:'Mommy',assetId:'character.mommy.v1'},
    {name:'Daddy',assetId:'character.daddy.v1'}
  ],
  friends:[
    {name:'Aaria',assetId:'character.aaria.v1'},
    {name:'Sophia',assetId:'character.sophia.v1'},
    {name:'Liam',assetId:'character.liam.v1'},
    {name:'Emma',assetId:'character.emma.v1'}
  ]
};

export function castForArtworkGroup(group){
  const cast=castByGroup[group];
  if(!cast)throw new Error(`Unknown artwork group '${group}'.`);
  return cast.map(person=>({...person}));
}

export function artworkCastBrief(group,action){
  const cast=castForArtworkGroup(group);
  const names=cast.map(person=>person.name);
  const groupScene=group==='aaria'
    ? 'Aaria is cooking on her own.'
    : group==='family'
      ? 'Show Aaria cooking together with both Mommy and Daddy.'
      : 'Show Aaria cooking together with all three friends: Sophia, Liam and Emma.';
  return `${groupScene} Include every assigned character: ${names.join(', ')}. Use their approved avatar references for recognizable faces and appearances; outfits may change. No hats, caps or sunglasses. Show this recipe-specific action: ${String(action||'preparing the recipe').trim()} Make the pose and kitchen activity distinct from other steps. Keep the food and action clear, warm, family-friendly, and consistent with the approved visual style.`;
}

export const CAST_GROUP_COUNTS={aaria:65,family:15,friends:15};
