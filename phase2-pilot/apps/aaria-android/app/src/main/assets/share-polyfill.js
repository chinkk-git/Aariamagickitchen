(function () {
  const bridge = window.AariaNative;
  if (!bridge || window.__aariaShareReady) return;
  window.__aariaShareReady = true;

  const readAsDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read image"));
    reader.readAsDataURL(file);
  });

  const share = async data => {
    const title = String(data && data.title || "");
    const body = String(data && (data.text || data.url) || "");
    if (data && data.files && data.files.length) {
      const image = await readAsDataUrl(data.files[0]);
      bridge.sharePost(image, [title, body].filter(Boolean).join("\n"));
      return;
    }
    bridge.shareText(title, body);
  };

  try {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: data => !data || !data.files ||
        (data.files.length <= 1 && data.files.every(file => /^image\/(png|jpeg)$/.test(file.type)))
    });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
  } catch (_) {}
})();
