(function () {
  if (window.__aariaWhatsappGroceryReady) return;
  window.__aariaWhatsappGroceryReady = true;

  const STORE = "aariaWhatsappRecipientsV1";
  const esc = value => String(value).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORE) || "{}"); }
    catch (_) { return {}; }
  };
  const write = value => localStorage.setItem(STORE, JSON.stringify(value));
  const getMessage = () => {
    try { if (typeof groceryMessage === "function") return groceryMessage(); }
    catch (_) {}
    const list = document.querySelector(".grocery-combined, .grocery-results, .grocery-shell");
    return list ? list.innerText : "";
  };

  const style = document.createElement("style");
  style.textContent = `
    #aaria-wa-shade{position:fixed;inset:0;z-index:10000;background:#21152dcc;display:grid;place-items:center;padding:18px}
    #aaria-wa-card{width:min(100%,460px);max-height:88vh;overflow:auto;border-radius:23px;background:#fffafc;padding:22px;color:#39274a;box-shadow:0 18px 55px #190d2780;font:500 15px/1.45 system-ui}
    #aaria-wa-card h2{margin:0 0 8px;color:#67258b;font-size:23px}
    #aaria-wa-card label{display:block;margin:13px 0 5px;font-weight:750}
    #aaria-wa-card input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #dbc8e6;border-radius:12px;font:inherit}
    .aaria-wa-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:17px}
    .aaria-wa-actions button,.aaria-wa-choice{border:0;border-radius:999px;padding:12px 16px;font:750 14px system-ui}
    .aaria-wa-choice{display:block;width:100%;margin:10px 0;background:#f4e9fa;color:#452752;text-align:left}
    .aaria-wa-primary{background:#23965b;color:#fff}
    .aaria-wa-muted{background:#eee7f3;color:#432650}
    #aaria-wa-error{color:#b32644;font-weight:700}
  `;
  document.head.appendChild(style);

  function close() { document.getElementById("aaria-wa-shade")?.remove(); }
  function modal(content) {
    close();
    const shade = document.createElement("div");
    shade.id = "aaria-wa-shade";
    shade.innerHTML = '<section id="aaria-wa-card" role="dialog" aria-modal="true">' + content + '</section>';
    shade.addEventListener("click", e => { if (e.target === shade) close(); });
    document.body.appendChild(shade);
    return shade;
  }
  function askSetup() {
    const contacts = read();
    const shade = modal(`
      <h2>WhatsApp grocery contacts 📲</h2>
      <p>Add Mommy’s and/or Daddy’s number with country code. These numbers stay on this device.</p>
      <form id="aaria-wa-form">
        <label for="aaria-wa-mom">Mommy’s number</label>
        <input id="aaria-wa-mom" inputmode="tel" autocomplete="tel" placeholder="e.g. 5511999999999" value="${esc(contacts.mom || "")}">
        <label for="aaria-wa-dad">Daddy’s number</label>
        <input id="aaria-wa-dad" inputmode="tel" autocomplete="tel" placeholder="e.g. 5511888888888" value="${esc(contacts.dad || "")}">
        <p id="aaria-wa-error" hidden>Enter at least one number with country code (8–15 digits).</p>
        <div class="aaria-wa-actions"><button type="button" class="aaria-wa-muted" data-wa-cancel>Cancel</button><button class="aaria-wa-primary">Save contacts</button></div>
      </form>`);
    shade.querySelector("[data-wa-cancel]").onclick = close;
    shade.querySelector("#aaria-wa-form").onsubmit = e => {
      e.preventDefault();
      const mom = shade.querySelector("#aaria-wa-mom").value.replace(/\D/g, "");
      const dad = shade.querySelector("#aaria-wa-dad").value.replace(/\D/g, "");
      if (![mom, dad].some(n => n.length >= 8 && n.length <= 15)) {
        shade.querySelector("#aaria-wa-error").hidden = false;
        return;
      }
      write({ mom: mom.length >= 8 && mom.length <= 15 ? mom : "", dad: dad.length >= 8 && dad.length <= 15 ? dad : "" });
      chooseRecipient();
    };
  }
  function chooseRecipient() {
    const contacts = read();
    const options = [
      contacts.mom && `<button class="aaria-wa-choice" data-wa-to="mom">💖 Mommy</button>`,
      contacts.dad && `<button class="aaria-wa-choice" data-wa-to="dad">💙 Daddy</button>`
    ].filter(Boolean).join("");
    const shade = modal(`<h2>Send the grocery list 🛒</h2><p>Choose who to message on WhatsApp.</p>${options}<div class="aaria-wa-actions"><button class="aaria-wa-muted" data-wa-edit>Edit numbers</button><button class="aaria-wa-muted" data-wa-cancel>Cancel</button></div>`);
    shade.querySelector("[data-wa-edit]").onclick = askSetup;
    shade.querySelector("[data-wa-cancel]").onclick = close;
    shade.querySelectorAll("[data-wa-to]").forEach(button => button.onclick = () => confirmSend(button.dataset.waTo));
  }
  function confirmSend(who) {
    const contacts = read();
    const number = contacts[who];
    const message = getMessage();
    if (!number || !message.trim()) { close(); return; }
    const parent = who === "mom" ? "Mommy" : "Daddy";
    const shade = modal(`<h2>Ready for WhatsApp? 📲</h2><p>Open a message to <b>${parent}</b> with the combined grocery list for the selected recipes.</p><p>WhatsApp will show the message before it is sent.</p><div class="aaria-wa-actions"><button class="aaria-wa-muted" data-wa-back>Back</button><button class="aaria-wa-primary" data-wa-send>Open WhatsApp</button></div>`);
    shade.querySelector("[data-wa-back]").onclick = chooseRecipient;
    shade.querySelector("[data-wa-send]").onclick = () => {
      close();
      window.location.href = "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
    };
  }

  document.addEventListener("click", event => {
    const button = event.target.closest('button[data-action="share-groceries"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const message = getMessage();
    if (!message.trim()) return;
    const contacts = read();
    if ((!contacts.mom || contacts.mom.length < 8) && (!contacts.dad || contacts.dad.length < 8)) askSetup();
    else chooseRecipient();
  }, true);
})();