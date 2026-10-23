# W03 international recipe visual previews

**These are W03 content previews, not Android APK screenshots.** They are rendered from the immutable recipe packages and their actual W03 final-dish and step art. They show EN-GB and PT-BR, ingredients/quantities, first/middle/final illustrated steps, per-serving nutrition, allergen/cross-contact notes, and adult assistance.

- Source content HEAD: [`3ed405438016dfc90123a9bfb810111e2190068f`](https://github.com/chinkk-git/Aariamagickitchen/commit/3ed405438016dfc90123a9bfb810111e2190068f) (W03 exclusive branch).
- Full artifact commit is the commit containing this index and images; see Issue #50 handoff comment for its exact SHA.
- All original recipe art is referenced offline from its W03 package; this preview renderer does not embed ingredient thumbnails.

## Contact sheets

- [All 15 recipes](contact-all-15.jpg)
- [Italy (3 recipes)](contact-italy.jpg)
- [China (3 recipes)](contact-china.jpg)
- [Japan (3 recipes)](contact-japan.jpg)
- [Mexico (3 recipes)](contact-mexico.jpg)
- [Vietnam (3 recipes)](contact-vietnam.jpg)

## Individual previews

| ID | Country | EN-GB | PT-BR | Visual preview | Structural readiness | Independent gates |
|---:|---|---|---|---|---|---|
| 96 | Italy | Tomato Basil Pasta | Massa com tomate e manjericão | [Open preview](096-italy.jpg) | STRUCTURAL_READY_WITH_NUTRITION_DATA_HOLD | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 97 | Italy | Mini Caprese Skewers | Mini espetinhos caprese | [Open preview](097-italy.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 98 | Italy | Air-Fryer Courgette Bites | Petiscos de abobrinha na air fryer | [Open preview](098-italy.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 99 | China | Vegetable Fried Rice | Arroz frito com legumes | [Open preview](099-china.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 100 | China | Rainbow Vegetable Noodles | Macarrão arco-íris com legumes | [Open preview](100-china.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 101 | China | Cucumber Sesame Salad | Salada de pepino com gergelim | [Open preview](101-china.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 102 | Japan | Veggie Sushi Rolls | Rolinhos de sushi com legumes | [Open preview](102-japan.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 103 | Japan | Onigiri Rice Balls | Bolinhos de arroz onigiri | [Open preview](103-japan.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 104 | Japan | Japanese Cucumber Salad | Salada japonesa de pepino | [Open preview](104-japan.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 105 | Mexico | Rainbow Veggie Tacos | Tacos arco-íris de legumes | [Open preview](105-mexico.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 106 | Mexico | Black Bean Quesadillas | Quesadillas de feijão-preto | [Open preview](106-mexico.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 107 | Mexico | Mexican Sweetcorn Cups | Copinhos mexicanos de milho | [Open preview](107-mexico.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 108 | Vietnam | Fresh Spring Rolls | Rolinhos frescos vietnamitas | [Open preview](108-vietnam.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 109 | Vietnam | Rice Noodle Salad | Salada vietnamita de macarrão de arroz | [Open preview](109-vietnam.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |
| 110 | Vietnam | Vietnamese Mango Salad | Salada vietnamita de manga | [Open preview](110-vietnam.jpg) | READY_FOR_INTEGRATION | Pending: A08/A09, nutrition/allergen, translation/cultural, artwork rights, security, Android |

## Visual inspection and audit

- All 15 individual previews were opened and visually inspected. After fixing clipped ingredient labels, ingredient-column overflow, and cross-contact key handling, no overlap, clipping, oversized ingredient artwork, or missing representative step artwork remained.
- Each preview is 1680 × 1440 pixels; image cards use contained artwork. Each includes final dish plus first, middle and final step art.
- The 13 remaining integration packages are IDs 97, 98, 100–110. All referenced package assets are present and match their recorded SHA-256 values.
- The asset audit found exact repeated hashes for 15 equipment illustrations shared across recipe paths. These are reusable source assets, not recipe-specific food-art duplicates; W01 should deduplicate by SHA-256 when packaging offline images.
- One source asset exceeds 1 MiB: #096 step-02 PNG (1,419,361 bytes, 1024 × 1024); it is outside the remaining-13 set. Remaining-13 per-recipe asset sizes and text extremes are recorded in [`preview-manifest.json`](preview-manifest.json).
- #096 sodium is null in the source and is labelled pending in its preview; nutrition review remains pending. No nutrition number was fabricated.
- W03 previews provide content-side visual evidence only. Android phone/tablet screenshots, actual renderer fit, APK size, and Android acceptance remain W01 responsibilities and are PENDING.
- Artwork rights, independent safety (A08), age suitability (A09), nutrition/allergen, translations/cultural and security approvals remain pending; this manifest records no independent gate as passed.
- Reproduce with [`render_previews.py`](render_previews.py); validate with [`build_audit.py`](build_audit.py).
