(function () {
  if (window.__aariaHomeAvatarInstalled) return;
  window.__aariaHomeAvatarInstalled = true;

  const avatarUrl = "https://appassets.androidplatform.net/aaria-home-avatar-v2.webp";
  const style = document.createElement("style");
  style.textContent = [
    ".home-note .aaria-avatar, .topbar .aaria-avatar {",
    "  background-image: url(\"" + avatarUrl + "\") !important;",
    "  background-size: cover !important;",
    "  background-position: center 32% !important;",
    "  background-repeat: no-repeat !important;",
    "}"
  ].join("\n");
  document.head.appendChild(style);
})();
