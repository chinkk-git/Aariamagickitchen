(function (global) {
  "use strict";
  if (global.AariaWorldAdventureGlobe) return;

  var ALLOWED = new Set(["india", "italy", "china", "japan", "mexico", "vietnam"]);
  var GEO = {
    india: { lat: 21, lon: 78 }, italy: { lat: 42.5, lon: 12.5 },
    china: { lat: 35, lon: 105 }, japan: { lat: 36, lon: 138 },
    mexico: { lat: 23, lon: -102 }, vietnam: { lat: 16, lon: 108 }
  };
  var FLAGS = { india: "🇮🇳", italy: "🇮🇹", china: "🇨🇳", japan: "🇯🇵", mexico: "🇲🇽", vietnam: "🇻🇳" };
  var WORDS = {
    "en-GB": { title: "World Adventure", intro: "Choose a country to explore its recipes.",
      prompt: "Tap a front-facing flag to see its recipes.", surprise: "Surprise Me!", passport: "Food Passport",
      landed: "The globe stopped at", tapFlag: "Tap the highlighted flag to explore.", noRecipes: "No recipes are available here yet.",
      reviewOnly: "Preview only · review pending", open: "Open recipe", noRoute: "Not available to open yet", back: "Back to countries",
      drag: "Drag the globe to spin it", country: "Country", destination: "destination" },
    "pt-BR": { title: "Aventura pelo mundo", intro: "Escolha um país para explorar as receitas.",
      prompt: "Toque em uma bandeira visível para ver as receitas.", surprise: "Surpreenda-me!", passport: "Passaporte culinário",
      landed: "O globo parou em", tapFlag: "Toque na bandeira destacada para explorar.", noRecipes: "Ainda não há receitas disponíveis aqui.",
      reviewOnly: "Prévia · revisão pendente", open: "Abrir receita", noRoute: "Ainda não disponível para abrir", back: "Voltar aos países",
      drag: "Arraste o globo para girá-lo", country: "País", destination: "destino" }
  };
  var SVG_LAND = [
    "M73 274l20-22 19-8 9-18 19-7 16 14 14 2 6 18 18 5 8 20-12 16-3 18-14 9-4 22-20 15-8 22-16 5-10-20-19-12-10-22-17-4-2-27-14-12-2-19z",
    "M170 480l21-12 21 9 15 18 10 28-7 24-12 16-5 34-13 38-15 17-9-15-2-27-12-17 7-28-10-20 3-24-12-19z",
    "M282 239l17-17 21 3 11 12 20-3 17 11 12-4 15 13 19-2 17 8 9 17-17 7-19-9-12 8-22-1-15 13-17-3-14 13-16-6-12 12-14-11-18 4-11-16-18-3-2-22 17-9 12-19z",
    "M368 324l26-13 26 4 18 20-2 26-13 20-5 31-19 22-3 30-17 27-16-20-8-29-12-22 4-28-10-22 7-28-7-20z",
    "M449 243l31-14 39 2 23 11 29-7 26 14 33-2 26 17 42-2 28 19 27 2 18 23-18 14-30-7-21 17-29-6-18 13-29-2-16 18-25-7-17 14-19-7-12 20-17-14-21 1-13-17-22-5-6-20-21-7-3-22-18-14 7-20z",
    "M576 344l21-11 28 5 18 20-10 19-23 7-18 16-19-12-10-23z",
    "M685 508l22-12 28 6 18 18 28 8 12 23-16 18-30-7-18 12-28-11-11-21-24-7z",
    "M784 684l22-6 19 13 14 23-14 15-24-6-14-19z",
    "M108 170l18-26 22-8 21 13-3 25-19 17-22-3z",
    "M530 419l22-12 12 7-11 18-18 3z"
  ];

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c];
    });
  }
  function normAngle(value) { return ((value + 180) % 360 + 360) % 360 - 180; }
  function chooseLocale(value) { return value === "pt-BR" ? "pt-BR" : "en-GB"; }
  function localized(value, locale) {
    if (value && typeof value === "object") return String(value[locale] || value["en-GB"] || "");
    return String(value || "");
  }
  function normalizeData(input, locale) {
    return (Array.isArray(input) ? input : []).filter(function (item) {
      return item && ALLOWED.has(String(item.id || item.country || "").toLowerCase());
    }).map(function (item) {
      var id = String(item.id || item.country).toLowerCase();
      var geo = GEO[id];
      return {
        id: id, name: localized(item.name, locale) || id, flag: item.flag || FLAGS[id],
        lat: Number.isFinite(Number(item.latitude)) ? Number(item.latitude) : geo.lat,
        lon: Number.isFinite(Number(item.longitude)) ? Number(item.longitude) : geo.lon,
        available: item.available !== false, recipes: Array.isArray(item.recipes) ? item.recipes : [],
        note: localized(item.note, locale)
      };
    });
  }
  function project(lat, lon, rotation, width, height) {
    var phi = lat * Math.PI / 180;
    var theta = normAngle(lon + rotation) * Math.PI / 180;
    var depth = Math.cos(phi) * Math.cos(theta);
    return { x: width / 2 + Math.cos(phi) * Math.sin(theta) * width * 0.43,
      y: height / 2 - Math.sin(phi) * height * 0.43, depth: depth };
  }

  function mount(root, options) {
    if (!root || !root.ownerDocument) throw new Error("Aaria globe requires a DOM element.");
    options = options || {};
    var doc = root.ownerDocument;
    var locale = chooseLocale(options.locale);
    var words = WORDS[locale];
    var supplied = typeof options.getDestinations === "function" ? options.getDestinations() : options.destinations;
    var destinations = normalizeData(supplied, locale);
    var panelKey = null;
    var destinationsVersion = 0;
    var state = { rotation: Number(options.initialState && options.initialState.rotation) || 0,
      selected: options.initialState && options.initialState.selected || null,
      pending: options.initialState && options.initialState.pending || null,
      animationToken: 0, pointer: null, lastX: 0, lastTime: 0, destroyed: false };

    root.classList.add("aria-world-globe-host");
    root.innerHTML = '<section class="aria-world-globe" lang="' + esc(locale) + '" aria-label="' + esc(words.title) + '">' +
      '<header class="aria-world-globe__header"><div><p class="aria-world-globe__eyebrow">' + esc(words.title) + '</p>' +
      '<h1>' + esc(words.intro) + '</h1></div><button class="aria-world-globe__passport" type="button" aria-label="' + esc(words.passport) + '">📖 <span>' + esc(words.passport) + '</span></button></header>' +
      '<div class="aria-world-globe__body"><div class="aria-world-globe__stage" aria-label="' + esc(words.drag) + '">' +
      '<div class="aria-world-globe__sphere"><svg class="aria-world-globe__atlas" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false"></svg>' +
      '<div class="aria-world-globe__flags" aria-label="' + esc(words.country) + ' flags"></div><div class="aria-world-globe__shine"></div></div>' +
      '<img class="aria-world-globe__guide" alt="Aaria, your cooking guide" />' +
      '<p class="aria-world-globe__guide-copy" aria-hidden="true"></p>' +
      '<div class="aria-world-globe__controls"><button class="aria-world-globe__surprise" type="button">🎲 ' + esc(words.surprise) + '</button></div>' +
      '<div class="aria-world-globe__sr" aria-live="polite" aria-atomic="true"></div></div>' +
      '<aside class="aria-world-globe__panel" aria-label="' + esc(words.intro) + '"></aside></div></section>';

    var shell = root.querySelector(".aria-world-globe");
    var stage = root.querySelector(".aria-world-globe__stage");
    var sphere = root.querySelector(".aria-world-globe__sphere");
    var flags = root.querySelector(".aria-world-globe__flags");
    var panel = root.querySelector(".aria-world-globe__panel");
    var atlas = root.querySelector(".aria-world-globe__atlas");
    var live = root.querySelector(".aria-world-globe__sr");
    var guide = root.querySelector(".aria-world-globe__guide");
    guide.src = options.avatarSrc || "./assets/aaria-portrait.webp";
    root.querySelector(".aria-world-globe__guide-copy").textContent = locale === "pt-BR" ? "Vamos explorar!" : "Let’s explore!";

    function buildAtlas() {
      var land = SVG_LAND.map(function (d) { return '<path d="' + d + '" />'; }).join("");
      atlas.innerHTML = '<defs><clipPath id="aria-globe-clip"><circle cx="500" cy="500" r="487" /></clipPath></defs>' +
        '<g clip-path="url(#aria-globe-clip)" class="aria-globe-map-world"><g class="aria-globe-map-shift">' +
        '<g class="aria-globe-map-copy aria-globe-map-copy--left" transform="translate(-1000 0)">' + land + '</g>' +
        '<g class="aria-globe-map-copy" transform="translate(0 0)">' + land + '</g>' +
        '<g class="aria-globe-map-copy aria-globe-map-copy--right" transform="translate(1000 0)">' + land + '</g>' +
        '</g></g>';
    }

    function getCountry(id) { return destinations.find(function (d) { return d.id === id; }) || null; }
    function getSelected() { return getCountry(state.selected); }
    function renderPanel(force) {
      var key = locale + "|" + (state.selected || "") + "|" + (state.pending || "") + "|" + destinationsVersion;
      if (!force && key === panelKey) return;
      panelKey = key;
      var country = getSelected();
      if (country) {
        var recipeCards = country.recipes.map(function (recipe) {
          var title = localized(recipe.title, locale) || String(recipe.title || "");
          var image = recipe.finishedDish || recipe.image || "";
          var canOpen = recipe.routeEnabled === true && Number.isInteger(Number(recipe.id)) && typeof options.onOpenRecipe === "function";
          var stateText = canOpen ? words.open : words.reviewOnly;
          var content = (image ? '<img class="aria-world-globe__dish" src="' + esc(image) + '" alt="" loading="lazy" />' : '<span class="aria-world-globe__dish-placeholder" aria-hidden="true">🍽️</span>') +
            '<span class="aria-world-globe__recipe-copy"><strong>' + esc(title) + '</strong><small>' + esc(stateText) + '</small></span>' +
            (canOpen ? '<span aria-hidden="true" class="aria-world-globe__open">›</span>' : '<span aria-hidden="true" class="aria-world-globe__lock">🔒</span>');
          return canOpen ? '<button class="aria-world-globe__recipe" type="button" data-recipe-id="' + esc(recipe.id) + '" aria-label="' + esc(words.open + ': ' + title) + '">' + content + '</button>' :
            '<div class="aria-world-globe__recipe aria-world-globe__recipe--locked" aria-label="' + esc(title + ". " + words.reviewOnly) + '">' + content + '</div>';
        }).join("");
        panel.innerHTML = '<div class="aria-world-globe__panel-head"><span class="aria-world-globe__country-flag" aria-hidden="true">' + esc(country.flag) + '</span><div><p>' + esc(words.country) + '</p><h2>' + esc(country.name) + '</h2></div>' +
          '<button class="aria-world-globe__close" type="button" aria-label="' + esc(words.back) + '">×</button></div>' +
          (country.note ? '<p class="aria-world-globe__note">' + esc(country.note) + '</p>' : '') +
          '<div class="aria-world-globe__recipe-list" aria-label="' + esc(country.name) + '">' + (recipeCards || '<p class="aria-world-globe__empty">' + esc(words.noRecipes) + '</p>') + '</div>';
        panel.classList.add("is-selected");
        panel.querySelector(".aria-world-globe__close").addEventListener("click", clearSelection);
        panel.querySelectorAll("button[data-recipe-id]").forEach(function (button) {
          button.addEventListener("click", function () { options.onOpenRecipe(Number(button.dataset.recipeId)); });
        });
      } else {
        var pending = getCountry(state.pending);
        var message = pending ? words.landed + " " + pending.name + ". " + words.tapFlag : words.prompt;
        panel.innerHTML = '<div class="aria-world-globe__empty-state"><span class="aria-world-globe__compass" aria-hidden="true">✦</span><h2>' + esc(pending ? pending.name : words.title) + '</h2><p>' + esc(message) + '</p></div>';
        panel.classList.remove("is-selected");
      }
    }

    function renderFlags() {
      var rect = sphere.getBoundingClientRect();
      var width = rect.width || 1, height = rect.height || 1;
      flags.innerHTML = "";
      destinations.forEach(function (country) {
        if (!country.available) return;
        var p = project(country.lat, country.lon, normAngle(state.rotation), width, height);
        if (p.depth <= 0.035) return;
        var button = doc.createElement("button");
        button.type = "button";
        button.className = "aria-world-globe__flag" + (state.pending === country.id ? " is-pending" : "") + (state.selected === country.id ? " is-selected" : "");
        button.style.left = p.x + "px";
        button.style.top = p.y + "px";
        button.style.setProperty("--flag-depth", String(Math.max(0.72, Math.min(1, p.depth))));
        button.setAttribute("aria-label", state.pending === country.id ? country.name + ", " + words.tapFlag : country.name);
        button.setAttribute("aria-pressed", state.selected === country.id ? "true" : "false");
        button.textContent = country.flag;
        button.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
        button.addEventListener("click", function (event) {
          event.stopPropagation();
          selectCountry(country.id);
        });
        flags.appendChild(button);
      });
    }

    function render() {
      var rotation = normAngle(state.rotation);
      var shift = -rotation * (1000 / 360);
      atlas.querySelector(".aria-globe-map-shift").setAttribute("transform", "translate(" + shift.toFixed(2) + " 0)");
      renderFlags();
      renderPanel();
    }
    function selectCountry(id) {
      if (!getCountry(id)) return;
      state.animationToken++;
      state.selected = id;
      state.pending = null;
      render();
      live.textContent = getCountry(id).name;
      if (typeof options.onCountrySelect === "function") options.onCountrySelect(id);
    }
    function clearSelection() {
      state.animationToken++;
      state.selected = null;
      state.pending = null;
      render();
      live.textContent = words.prompt;
    }
    function animateRotation(target, duration) {
      var token = ++state.animationToken;
      var start = state.rotation;
      var begin = global.performance && performance.now ? performance.now() : Date.now();
      var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var total = reduced ? 0 : duration;
      function frame(now) {
        if (state.destroyed || token !== state.animationToken) return;
        var progress = total ? Math.min(1, (now - begin) / total) : 1;
        var eased = 1 - Math.pow(1 - progress, 3);
        state.rotation = start + (target - start) * eased;
        render();
        if (progress < 1) global.requestAnimationFrame(frame);
        else { state.rotation = normAngle(target); render();
          if (state.pending) { var pendingFlag = flags.querySelector(".is-pending"); if (pendingFlag) pendingFlag.focus({ preventScroll: true }); }
        }
      }
      global.requestAnimationFrame(frame);
    }
    function surprise() {
      var pool = destinations.filter(function (d) { return d.available; });
      if (!pool.length) return;
      var candidate = pool[Math.floor(Math.random() * pool.length)];
      state.selected = null;
      state.pending = candidate.id;
      var destination = normAngle(-candidate.lon);
      var direction = Math.random() < 0.5 ? -1 : 1;
      var delta = normAngle(destination - normAngle(state.rotation));
      var laps = 360 * (1 + Math.floor(Math.random() * 2));
      var target = state.rotation + delta + direction * laps;
      if (Math.sign(target - state.rotation) !== direction) target += direction * 360;
      live.textContent = words.landed + " " + candidate.name + ". " + words.tapFlag;
      renderPanel();
      animateRotation(target, 1900);
    }
    function onPointerDown(event) {
      if (event.target.closest("button")) return;
      state.animationToken++;
      state.selected = null;
      state.pending = null;
      state.pointer = event.pointerId;
      state.startX = event.clientX;
      state.startRotation = state.rotation;
      state.lastX = event.clientX;
      state.lastTime = performance.now();
      stage.classList.add("is-dragging");
      stage.setPointerCapture(event.pointerId);
      renderPanel();
    }
    function onPointerMove(event) {
      if (state.pointer !== event.pointerId) return;
      var dx = event.clientX - state.startX;
      state.rotation = state.startRotation + dx * 0.55;
      state.lastVelocity = (event.clientX - state.lastX) / Math.max(1, performance.now() - state.lastTime);
      state.lastX = event.clientX;
      state.lastTime = performance.now();
      render();
    }
    function onPointerUp(event) {
      if (state.pointer !== event.pointerId) return;
      state.pointer = null;
      stage.classList.remove("is-dragging");
      var drift = Math.max(-36, Math.min(36, (state.lastVelocity || 0) * 90));
      if (Math.abs(drift) > 3) animateRotation(state.rotation + drift, 420);
      else render();
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    }
    function onResize() { render(); }

    buildAtlas();
    root.querySelector(".aria-world-globe__surprise").addEventListener("click", surprise);
    root.querySelector(".aria-world-globe__passport").addEventListener("click", function () {
      if (typeof options.onOpenPassport === "function") options.onOpenPassport();
    });
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    global.addEventListener("resize", onResize);
    if (typeof ResizeObserver !== "undefined") {
      var observer = new ResizeObserver(onResize);
      observer.observe(sphere);
      state.observer = observer;
    }
    render();

    return {
      handleBack: function () { if (state.selected || state.pending) { clearSelection(); return true; } return false; },
      getState: function () { return { rotation: state.rotation, selected: state.selected, pending: state.pending }; },
      setLocale: function (next) { locale = chooseLocale(next); words = WORDS[locale]; shell.lang = locale; panelKey = null; renderPanel(true); },
      setDestinations: function (next) { destinations = normalizeData(next, locale); destinationsVersion++; if (!getCountry(state.selected)) state.selected = null; if (!getCountry(state.pending)) state.pending = null; render(); },
      restoreState: function (next) { next = next || {}; state.rotation = Number(next.rotation) || 0; state.selected = getCountry(next.selected) ? next.selected : null; state.pending = getCountry(next.pending) ? next.pending : null; render(); },
      destroy: function () { state.destroyed = true; state.animationToken++; if (state.observer) state.observer.disconnect(); global.removeEventListener("resize", onResize); root.classList.remove("aria-world-globe-host"); root.innerHTML = ""; }
    };
  }
  global.AariaWorldAdventureGlobe = { mount: mount, version: "0.1.0-review" };
})(window);
