# V3.5 Web validation record

## Completed checks

- Build generated the modular directory and standalone HTML from the protected production input plus the exact V3.4 source reference `4cbd0d3414556973e5790ee02a8232aa917bdd8a` and pinned wave-one handoff `451ab0bf8a3ab1867cf004a113d3d8e6896ccf60`.
- Focused static validator confirmed 97 unique catalog records: the unchanged original 95 plus #096 Italy and #099 China. It also confirmed the two recipes' EN-GB/PT-BR data and required artwork files.
- Focused static validator compared the extracted original 95 rows byte-for-byte with production source data.
- `node --check` passed for the recipe data module, app module, V3.4 runtime, browser adapter, and service worker.
- Confirmed the source app retains its v4 localStorage key, hash/popstate route restoration, camera capture and file-picker inputs, and photo-share path. The package registers a service worker with a relative `./` scope.
- Confirmed the protected main HEAD and root HTML SHA-256 still match the C0 record.

## Not verified

- Visual browser interaction, responsive screenshots, real camera/share flows, service-worker installation, and offline reload could not be run. The local environment has no Playwright browser executable; the available cloud browser cannot connect to this isolated local preview.
- Independent A08/A09, security, accessibility, nutrition/allergen, and artwork-rights reviews remain separate gates. This report does not mark them passed.
- C4 final parity remains blocked: Android run 223 for exact source HEAD `22dc0ef9ca0467feceb1d42de7f6d3c8d7cdab32` failed in representative screenshot capture with `Timed out waiting for WebView DevTools Runtime.evaluate`. The app source was not established as failed or accepted; a focused evidence retry is required.
