# Previous-production PWA fixtures

These three files are copied from production parent commit `b0a13e5b7fa5efc19076b4d7ba726d6505de51bc`, immediately before Magical Updates PR #85 changed the application shell cache from `r1` to `r2`.

The migration test serves this HTML, adapter, and service worker as an installed previous-version PWA, then changes the same origin to the current candidate release. All other assets come from the checked-out candidate so the test stays small and isolates the real registration, activation, navigation, offline-cache, and data-preservation behavior.
