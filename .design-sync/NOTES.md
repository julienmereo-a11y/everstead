# design-sync notes — Everstead

## What this sync is
This repo is the **Everstead application** (Vite + React + Tailwind), NOT a design-system
library. On 2026-06-19 the user chose **brand/tokens only** scope: extract Tailwind tokens,
fonts, and signature CSS classes so the Claude Design agent builds on-brand Everstead UI.
No React components are synced (the repo's `src/components` are app features / route guards,
not reusable design primitives, and the Vite `dist/` is a bundled site, not a component library).

## How the bundle is produced (off-script, brand-only)
1. `.ds-tw/tw.config.cjs` is a temp Tailwind config mirroring `tailwind.config.js` theme
   (stone/navy/sage palettes, Cormorant Garamond + DM Sans, fade animations), with a
   `safelist` for the brand utilities (`bg|text|border|ring|from|via|to|fill|stroke` ×
   each shade, `hover:`/`focus:` variants) and `preflight: false`.
2. `npx tailwindcss -c .ds-tw/tw.config.cjs ...` → `.ds-tw/brand-utilities.css` →
   copied to `ds-bundle/_brand-utilities.css`.
3. `ds-bundle/styles.css` is the entry; its `@import` closure pulls in: Google Fonts,
   `tokens/tokens.css` (CSS variables), `_brand-utilities.css`, `_custom.css` (signature
   classes verbatim from `src/index.css`).
4. `ds-bundle/README.md` is the conventions doc for the design agent.

To re-sync after the brand changes: re-run step 1–2, then re-upload `ds-bundle/`.

## If the user later wants real components
Would need a proper library build (component export surface + per-component compiled
output), which this app repo doesn't have. That's the "full import" path, not done here.
