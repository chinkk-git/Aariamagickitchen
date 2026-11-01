(function () {
  if (window.__aariaMobileFixesInstalled) return;
  window.__aariaMobileFixesInstalled = true;

  const style = document.createElement("style");
  style.textContent = `
    .reference-active .bottom { display:grid !important; grid-template-columns:repeat(4,minmax(0,1fr)) !important; }
    .reference-active .page { padding-bottom:110px !important; }
    .reference-active .bottom { position:fixed !important; left:0 !important; right:0 !important; bottom:0 !important; z-index:9997 !important; }
    .reference-active .bottom .tab { min-width:0; }
  `;
  document.head.appendChild(style);

  function updateHomeName() {
    let portuguese = false;
    try { portuguese = typeof state !== "undefined" && state.language === "pt-BR"; } catch (_) {}
    const brand = document.querySelector(".home-brand strong");
    if (brand) {
      const expected = portuguese ? "✨ Cozinha mágica da Aaria" : "✨ Aaria’s\nMagical Kitchen";
      const current = brand.textContent.replace(/\s+/g, " ").trim();
      if (current !== expected.replace(/\s+/g, " ").trim()) {
        brand.innerHTML = portuguese ? "✨ Cozinha mágica<br>da Aaria" : "✨ Aaria’s<br>Magical Kitchen";
      }
    }
    document.title = portuguese ? "Cozinha mágica da Aaria" : "Aaria’s Magical Kitchen";
  }

  const screen = document.getElementById("screen");
  if (screen) new MutationObserver(updateHomeName).observe(screen, { childList:true, subtree:true });
  document.getElementById("languageSelect")?.addEventListener("change", updateHomeName);
  updateHomeName();
})();