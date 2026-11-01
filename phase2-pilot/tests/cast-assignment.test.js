import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkCastBrief, castForArtworkGroup} from '../tools/recipe-pipeline/cast-assignment.js';

test('recipe theme selects the approved cast and avatar files',()=>{
  const expected={
    aaria:[['Aaria'],['character.aaria.v1']],
    family:[['Aaria','Mommy','Daddy'],['character.aaria.v1','character.mommy.v1','character.daddy.v1']],
    friends:[['Aaria','Sophia','Liam','Emma'],['character.aaria.v1','character.sophia.v1','character.liam.v1','character.emma.v1']]
  };
  for(const [group,[names,ids]] of Object.entries(expected)){
    const cast=castForArtworkGroup(group);
    assert.deepEqual(cast.map(person=>person.name),names);
    assert.deepEqual(cast.map(person=>person.assetId),ids);
    const brief=artworkCastBrief(group,'mix the ingredients in a bowl');
    for(const name of names)assert.ok(brief.includes(name));
    assert.match(brief,/No hats, caps or sunglasses/);
    assert.match(brief,/mix the ingredients in a bowl/);
  }
});
