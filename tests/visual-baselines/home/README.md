# Home visual baselines

These six full-page JPEGs are captured from the published `https://abcsafari.ru/play/` UI at device scale factor 1. They cover locked and unlocked Training states at 1440×900, 390×844 and 320×568.

Run `node scripts/home-visual-regression.cjs` with Playwright available (or set `HOME_VISUAL_PLAYWRIGHT` to its module directory) to compare the local page. Set `HOME_VISUAL_BROWSER` only when Playwright cannot find its own Chromium. Use `--update` only after the published home screen is intentionally changed and separately approved.

In a sandbox where Chromium cannot launch, set `HOME_VISUAL_ACTUAL_DIR` to a directory containing already captured `local-home-<state>-<width>x<height>.jpg` files. The same comparator and thresholds are used; only screenshot capture is skipped.

`manifest.json` records source, dimensions, byte lengths and SHA-256 hashes so ordinary unit tests detect missing or silently replaced references without requiring a browser.
