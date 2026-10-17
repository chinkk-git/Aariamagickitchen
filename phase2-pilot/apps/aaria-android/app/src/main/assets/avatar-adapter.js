(function () {
  if (window.__aariaHomeAvatarInstalled) return;
  window.__aariaHomeAvatarInstalled = true;
  const style = document.createElement("style");
  style.textContent = ".home-note .aaria-avatar, .topbar .aaria-avatar { background-image: var(--avatar-image) !important; }";
  document.head.appendChild(style);
})();