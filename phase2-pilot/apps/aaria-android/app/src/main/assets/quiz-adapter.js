(function () {
  if (window.__aariaQuizReady) return;
  window.__aariaQuizReady = true;

  const esc = value => String(value).replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])
  );
  const sample = values => values[Math.floor(Math.random() * values.length)];
  const unique = values => [...new Set(values.filter(Boolean))];
  const recipes = () => {
    try { return typeof RECIPES !== "undefined" ? RECIPES : []; } catch (_) { return []; }
  };
  const currentRecipe = () => {
    try {
      if (typeof view === "undefined" || view !== "recipe" || !selected) return null;
      return selected;
    } catch (_) { return null; }
  };

  const style = document.createElement("style");
  style.textContent = `
    #aaria-quiz-launch{position:fixed;right:16px;bottom:92px;z-index:9980;border:0;border-radius:999px;padding:13px 18px;background:#7226a1;color:#fff;font:800 15px system-ui;box-shadow:0 5px 18px #31104b44}
    #aaria-quiz-shade{position:fixed;inset:0;z-index:9998;background:#22122dcc;display:grid;place-items:center;padding:18px}
    #aaria-quiz-card{width:min(100%,520px);max-height:88vh;overflow:auto;border-radius:24px;background:#fffafc;padding:22px;color:#34264d;box-shadow:0 18px 55px #190d2780}
    #aaria-quiz-card h2{margin:0 0 8px;color:#67258b;font:800 25px system-ui}
    #aaria-quiz-card p{line-height:1.45}
    .aaria-quiz-option{display:block;width:100%;margin:9px 0;padding:13px 14px;border:2px solid #e8d9f3;border-radius:14px;background:#fff;text-align:left;font:600 15px/1.35 system-ui;color:#34264d}
    .aaria-quiz-option:disabled{opacity:1}
    .aaria-quiz-option.correct{border-color:#29935c;background:#e7f8ed}
    .aaria-quiz-option.incorrect{border-color:#cf5360;background:#fff0f1}
    #aaria-quiz-feedback{padding:10px 12px;border-radius:12px;background:#f4ebfb}
    .aaria-quiz-controls{display:flex;gap:10px;justify-content:flex-end;margin-top:15px}
    .aaria-quiz-controls button{border:0;border-radius:999px;padding:12px 16px;font:750 15px system-ui}
    #aaria-quiz-next{background:#7226a1;color:white}
    #aaria-quiz-close{background:#eee5f5;color:#432650}
    #aaria-nutrition-review{margin:12px 0;padding:13px 15px;border:2px solid #e3ac43;border-radius:15px;background:#fff7dc;color:#533d15;font:600 14px/1.45 system-ui}
    @media(max-width:520px){#aaria-quiz-launch{right:12px;bottom:86px;padding:12px 14px}}
  `;
  document.head.appendChild(style);

  function buildQuestions(recipe) {
    const all = recipes().filter(item => item.id !== recipe.id);
    const ingredients = (recipe.ingredients || []).map(item =>
      typeof item === "string" ? item : item.name
    ).filter(Boolean);
    const firstStep = Array.isArray(recipe.steps) ? recipe.steps[0] : "";
    const methods = unique(all.map(item => item.method).filter(method => method !== recipe.method));
    const titles = unique(all.map(item => item.title));
    const steps = unique(all.map(item => Array.isArray(item.steps) ? item.steps[0] : ""));
    const makeOptions = (answer, pool) => {
      const distractors = unique(pool.filter(value => value !== answer));
      const options = [answer, ...distractors.slice(0, 2)];
      while (options.length < 3) options.push(answer);
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return options;
    };
    const ingredient = sample(ingredients) || recipe.title;
    return [
      { prompt: "Which ingredient is used in this recipe?", answer: ingredient, options: makeOptions(ingredient, all.flatMap(item => (item.ingredients || []).map(value => typeof value === "string" ? value : value.name))) },
      { prompt: "What cooking method does this recipe use?", answer: recipe.method || "No cooking", options: makeOptions(recipe.method || "No cooking", methods) },
      { prompt: "Which is the first step for this recipe?", answer: firstStep || "Ask a grown-up to help", options: makeOptions(firstStep || "Ask a grown-up to help", steps) }
    ];
  }

  let quiz = null;
  function openQuiz(recipe) {
    quiz = { recipe, questions: buildQuestions(recipe), index: 0, score: 0, answered: false };
    drawQuiz();
  }
  function drawQuiz() {
    if (!quiz) return;
    const old = document.getElementById("aaria-quiz-shade");
    if (old) old.remove();
    const final = quiz.index >= quiz.questions.length;
    const shade = document.createElement("div");
    shade.id = "aaria-quiz-shade";
    shade.setAttribute("role", "presentation");
    if (final) {
      shade.innerHTML = `<section id="aaria-quiz-card" role="dialog" aria-modal="true" aria-labelledby="aaria-quiz-title"><h2 id="aaria-quiz-title">Kitchen quiz complete! ✨</h2><p>You got <b>${quiz.score} of ${quiz.questions.length}</b> right for ${esc(quiz.recipe.title)}.</p><p>Great cooking detective work!</p><div class="aaria-quiz-controls"><button id="aaria-quiz-close">Close</button><button id="aaria-quiz-next">Play again</button></div></section>`;
    } else {
      const question = quiz.questions[quiz.index];
      shade.innerHTML = `<section id="aaria-quiz-card" role="dialog" aria-modal="true" aria-labelledby="aaria-quiz-title"><h2 id="aaria-quiz-title">Kitchen quiz ✨</h2><p><b>${esc(quiz.recipe.title)}</b> · Question ${quiz.index + 1} of ${quiz.questions.length}</p><p>${esc(question.prompt)}</p><div id="aaria-quiz-options">${question.options.map((option,index)=>`<button class="aaria-quiz-option" data-quiz-option="${index}">${esc(option)}</button>`).join("")}</div>${quiz.answered?`<p id="aaria-quiz-feedback">${quiz.questions[quiz.index].options[quiz.questions[quiz.index].answerIndex]===undefined?'': ''}${quiz.lastCorrect?'Correct! 🌟':'The answer is: '+esc(question.answer)}</p><div class="aaria-quiz-controls"><button id="aaria-quiz-close">Close</button><button id="aaria-quiz-next">${quiz.index + 1 === quiz.questions.length?'See score':'Next'}</button></div>`:''}</section>`;
      if (!question.answerIndex) question.answerIndex = question.options.indexOf(question.answer);
    }
    shade.addEventListener("click", event => {
      if (event.target === shade) { quiz = null; shade.remove(); return; }
      const optionButton = event.target.closest("[data-quiz-option]");
      if (optionButton && !quiz.answered) {
        const question = quiz.questions[quiz.index];
        const chosen = Number(optionButton.dataset.quizOption);
        quiz.lastCorrect = chosen === question.answerIndex;
        if (quiz.lastCorrect) quiz.score++;
        quiz.answered = true;
        drawQuiz();
        const correct = document.querySelector(`.aaria-quiz-option[data-quiz-option="${question.answerIndex}"]`);
        if (correct) correct.classList.add("correct");
        const selected = document.querySelector(`.aaria-quiz-option[data-quiz-option="${chosen}"]`);
        if (selected && !quiz.lastCorrect) selected.classList.add("incorrect");
        document.querySelectorAll(".aaria-quiz-option").forEach(button => button.disabled = true);
        return;
      }
      if (event.target.id === "aaria-quiz-close") { quiz = null; shade.remove(); return; }
      if (event.target.id === "aaria-quiz-next") {
        if (quiz.index >= quiz.questions.length) { quiz = null; openQuiz(currentRecipe() || shade.__recipe || {id:0,title:"Kitchen",ingredients:[],steps:[]}); return; }
        quiz.index++;
        quiz.answered = false;
        if (quiz.index > quiz.questions.length - 1) quiz.index = quiz.questions.length;
        drawQuiz();
      }
    });
    shade.__recipe = quiz.recipe;
    document.body.appendChild(shade);
  }

  function update() {
    const recipe = currentRecipe();
    let button = document.getElementById("aaria-quiz-launch");
    if (!recipe) {
      if (button) button.remove();
      const note = document.getElementById("aaria-nutrition-review");
      if (note) note.remove();
      return;
    }
    if (!button) {
      button = document.createElement("button");
      button.id = "aaria-quiz-launch";
      button.type = "button";
      button.textContent = "✨ Recipe quiz";
      button.addEventListener("click", () => {
        const current = currentRecipe();
        if (current) openQuiz(current);
      });
      document.body.appendChild(button);
    }
  }

  const originalCreateWeek = typeof createWeek === "function" ? createWeek : null;

  function createNutritionAwareWeek() {
    try {
      if (typeof nutritionValue !== "function" || typeof NUTRIENT_COLUMNS === "undefined") {
        return originalCreateWeek ? originalCreateWeek() : { ids: [], locks: [] };
      }
      const keys = NUTRIENT_COLUMNS.map(column => column[0]);
      const profiles = recipes().map(recipe => {
        try {
          const result = nutritionValue(recipe);
          const values = {};
          keys.forEach(key => {
            const range = result.per[key];
            const value = Array.isArray(range)
              ? (Number(range[0]) + Number(range[1])) / 2
              : Number(range);
            values[key] = Number.isFinite(value) ? value : null;
          });
          return { recipe, values, missing: (result.missing || []).length };
        } catch (_) {
          return { recipe, values: Object.fromEntries(keys.map(key => [key, null])), missing: 99 };
        }
      });
      const median = values => {
        const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
        if (!sorted.length) return 0;
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
      };
      const targets = {};
      const scales = {};
      keys.forEach(key => {
        const known = profiles.map(profile => profile.values[key]).filter(Number.isFinite);
        targets[key] = median(known);
        scales[key] = Math.max(median(known.map(value => Math.abs(value - targets[key]))), Math.abs(targets[key]) * 0.2, 1);
      });

      const remaining = [...profiles];
      const picked = [];
      const sums = Object.fromEntries(keys.map(key => [key, 0]));
      const categories = new Map();
      const methods = new Map();
      while (picked.length < 7 && remaining.length) {
        const scored = remaining.map(profile => {
          let score = 0;
          keys.forEach(key => {
            const value = profile.values[key];
            const projectedMean = (sums[key] + (Number.isFinite(value) ? value : targets[key])) / (picked.length + 1);
            score += Math.abs(projectedMean - targets[key]) / scales[key];
          });
          score /= Math.max(keys.length, 1);
          const category = profile.recipe.category || "Other";
          const method = profile.recipe.method || "Other";
          score += (categories.get(category) || 0) * 0.08;
          score += (methods.get(method) || 0) * 0.045;
          score += Math.min(profile.missing, 8) * 0.012;
          score += Math.random() * 0.09;
          return { profile, score };
        }).sort((a, b) => a.score - b.score);
        const choicePool = scored.slice(0, Math.min(8, scored.length));
        const chosen = choicePool[Math.floor(Math.random() * choicePool.length)].profile;
        picked.push(chosen.recipe.id);
        keys.forEach(key => {
          const value = chosen.values[key];
          sums[key] += Number.isFinite(value) ? value : targets[key];
        });
        const category = chosen.recipe.category || "Other";
        const method = chosen.recipe.method || "Other";
        categories.set(category, (categories.get(category) || 0) + 1);
        methods.set(method, (methods.get(method) || 0) + 1);
        remaining.splice(remaining.indexOf(chosen), 1);
      }
      return {
        ids: picked,
        locks: [false, false, false, false, false, false, false]
      };
    } catch (_) {
      return originalCreateWeek ? originalCreateWeek() : { ids: [], locks: [] };
    }
  }

  try { if (typeof createWeek === "function") createWeek = createNutritionAwareWeek; } catch (_) {}

  function updateNutritionNote() {
    let inWeek = false;
    try { inWeek = typeof view !== "undefined" && view === "week"; } catch (_) {}
    let note = document.getElementById("aaria-nutrition-review");
    const list = document.querySelector(".weeklist");
    if (!inWeek || !list) {
      if (note) note.remove();
      return;
    }
    if (!note) {
      note = document.createElement("aside");
      note.id = "aaria-nutrition-review";
      note.setAttribute("role", "note");
      note.textContent = "This week is mixed using the app’s ingredient-based nutrient estimates and recipe variety. Some estimates are incomplete, and the plan is not tailored to Aaria’s personal needs. Ask a grown-up to review portions, ingredients and allergies.";
    }
    if (note.parentNode !== list.parentNode || note.nextElementSibling !== list) {
      list.parentNode.insertBefore(note, list);
    }
  }

  let updateQueued = false;
  const observer = new MutationObserver(() => {
    if (updateQueued) return;
    updateQueued = true;
    requestAnimationFrame(() => {
      updateQueued = false;
      update();
      updateNutritionNote();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  update();
  updateNutritionNote();
})();
