# Everstead — brand & design tokens

Everstead is a calm, trustworthy product for UK families organising their accounts,
documents, and important decisions. The visual voice is **warm, editorial, and reassuring**:
a serif display face over warm-grey surfaces, a steady navy for action, and a quiet sage accent.

This is a **brand/tokens** design system — fonts, colors, and the signature CSS patterns.
There are no packaged React components; build layouts with these tokens and Everstead's idiom.

## How it's styled — Tailwind utilities

Everstead is a **Tailwind CSS** codebase. Style with Tailwind utility classes; the brand
palettes and fonts below are real, compiled classes available in this system
(`_brand-utilities.css`). Use them directly — do not invent new color names.

### Palette (each has the full `50 100 200 300 400 500 600 700 800 900` ramp; stone & navy also `950`)

| Family | Role | Key shades |
|---|---|---|
| `stone` | warm neutrals — surfaces, text, borders | `stone-50` app bg · `stone-200` hairline borders · `stone-500` muted text · `stone-900` primary text |
| `navy`  | primary brand — CTAs, links, dark heroes | `navy-600` primary action · `navy-800`→`navy-950` hero gradient · `navy-600` light-bg eyebrow |
| `sage`  | green accent — accents on dark, success | `sage-400` dark-bg eyebrow · `sage-500` accent |

Color utilities compiled for every shade: `bg-` `text-` `border-` `ring-` `from-` `via-` `to-`
`fill-` `stroke-`, with `hover:` and `focus:` variants. E.g. `bg-navy-600 hover:bg-navy-700`,
`text-stone-900`, `border-stone-200`, `from-navy-950 to-navy-800`, `text-sage-400`.

### Type

- `font-display` → **Cormorant Garamond** (serif). Headings, hero titles, pull quotes. `h1/h2/h3` default to it.
- `font-sans` → **DM Sans**. Body, UI, labels. The page default.

Pair them: serif display heading + DM Sans body is the core of Everstead's voice.

### Signature classes (in `_custom.css`)

- `.card-light` — white surface, `stone-200` border, `1rem` radius. The default card.
- `.card-dark` — translucent white-on-dark surface for cards over the navy hero.
- `.section-label` + `.section-label-light` (navy) / `.section-label-dark` (sage) — the small uppercase eyebrow above a heading.
- `.page-hero` / `.page-hero-bg` / `.page-hero-glow` — the full-bleed dark navy gradient header used at the top of every section page.
- `.grain` — add to a positioned box for subtle film-grain texture.
- `.reveal` (+ `.reveal-delay-1`…`5`) and `animate-fade-up` / `animate-fade-in` (+ `.animate-delay-100`…`600`) — entrance/scroll-reveal motion.
- `.text-balance` — balanced multi-line headings.

### Tokens

Every color/font is also a CSS variable in `tokens/tokens.css` (e.g. `var(--color-navy-600)`,
`var(--font-display)`, `var(--gradient-hero)`, `var(--radius-card)`) for when a utility class
doesn't fit. Engineers can adopt the matching Tailwind config via `tokens/tailwind-preset.js`.

## Where the truth lives

Read these before styling: `styles.css` (the entry — `@import` order and base defaults),
`_brand-utilities.css` (every available class), `_custom.css` (the signature patterns),
`tokens/tokens.css` (the variables).

## One idiomatic snippet

```jsx
// A section with the eyebrow + serif heading + light cards, on the warm-grey page.
<section className="bg-stone-50 px-6 py-20">
  <div className="mx-auto max-w-5xl text-center">
    <span className="section-label section-label-light">Why Everstead</span>
    <h2 className="font-display text-4xl text-stone-900 text-balance">
      Everything that matters, in one place.
    </h2>
    <p className="mt-4 font-sans text-lg text-stone-500">
      One secure home for accounts, documents, and the decisions that count.
    </p>
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      <div className="card-light p-6 text-left">
        <h3 className="font-display text-xl text-navy-800">Organised for life</h3>
        <p className="mt-2 font-sans text-stone-600">Kept current today, ready when it matters.</p>
        <button className="mt-4 rounded-full bg-navy-600 px-5 py-2 font-sans text-white hover:bg-navy-700">
          Get started
        </button>
      </div>
    </div>
  </div>
</section>
```

For a dark hero, wrap content over `.page-hero` with a `.page-hero-bg` (navy gradient) layer,
a `.page-hero-glow` layer, and use `card-dark`, `text-stone-50`, and `section-label-dark`.
