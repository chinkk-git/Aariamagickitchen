# Aaria V3.5 Web Edition

This package is isolated under `web-v3.5/`. It is generated from the protected production `index.html`, the exact approved V3.4 source reference, and the pinned existing wave-one packages for #096 Italy and #099 China. The protected root source is an input only.

The current package is the **97-recipe foundation preview**. Android V3.5 acceptance is not established: run 223 failed during representative WebView screenshot capture (`Runtime.evaluate` timeout). The 19 new records have not been merged into this web edition yet. The 116-recipe release ZIP must be rebuilt after the accepted Android source commit is available.

## Build

From the repository root, run:

```sh
node web-v3.5/scripts/build.mjs
```

The build generates `dist/web-v3.5/`, a portable standalone HTML file, and SHA-256 checksums. It does not modify root `index.html` or publish to GitHub Pages.

## Local preview

Serve the repository root with a static HTTP server, then open `/web-v3.5/` (or use the isolated HTTPS preview). The structured `index.html` depends on sibling CSS, JavaScript, and artwork files; opening that one file through Android's `content://` provider or `file://` does not load the package. The standalone HTML is the one-file option and inlines CSS, JavaScript, and wave-one recipe art. The service worker registers only from the package directory. Browser features that require a secure origin, including PWA installation, may be unavailable under `file://` or `content://`.

The app retains the existing `aariaPrivateKitchenV4` storage key and existing data model; this packaging layer performs no user-data migration.
