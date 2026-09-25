# Brand & UI — "Register"

EduBatch is built around one object every coaching student in India knows: the ruled
exercise notebook. Every visual decision comes from it, so nothing is decoration for its own sake.

## Principles

- **One idea, used everywhere.** Ruled paper, a red margin line, blue pen ink, a highlighter.
- **Spend boldness in one place.** The only orchestrated motion is the opening preloader and
  the login scene. Inside the app, motion only answers what the user did (nav highlight
  sliding, drawer, toasts, crop).
- **Colour carries meaning.** Blue ink = action. Margin red = absent, pending, errors.
  Highlighter = today / active / unread. Green = present, paid.
- **Avoided on purpose:** cream + serif + terracotta, gradient washes, identical cards with
  grey shadows, all-caps eyebrow labels, arrow-suffixed buttons, glow, neon.

## Tokens (`client/src/index.css`)

| Token | Hex | Role |
|---|---|---|
| `ink` | `#1f3494` | Blue ballpoint: primary buttons, links, headings |
| `paper` | `#f4f6fa` | Cool notebook white (deliberately not cream) |
| `rule` | `#c9d5ec` | Ruling lines |
| `margin` | `#de4f5a` | Notebook margin: sidebar edge, index-card header rules |
| `marigold` (highlighter) | `#f5d73a` | Active nav, "late", focus halo, selection |
| `forest` | `#257a4e` | Present, paid |
| `attention` | `#c2333d` | Absent, fee pending, errors |

Shadows are tinted with ink (`--shadow-sheet`, `--shadow-lift`), never neutral grey.
Radii follow hierarchy: sheets 10px, cards 8px, controls 6px, pills 4px.

Type: **Newsreader** (serif) for the wordmark and page titles, **IBM Plex Sans** for UI,
tabular numerals for every figure. No handwriting fonts: the "pen" is expressed through
SVG strokes instead.

## Logo

An **E written in three pen strokes whose middle arm finishes as a tick** — a letter, a stack
of batches, and an attendance mark. `components/brand/Logo.jsx` (`LogoMark`, `Logo`) and
`public/favicon.svg` share the same geometry. `LogoMark draw` animates the strokes.

## What changed

| Area | Before | Now |
|---|---|---|
| First load | Spinner | Preloader: the E writes itself, the name is revealed behind the margin line. Once per session, covers the Render cold start, respects reduced motion |
| Login / register / reset | Centered card | Desktop split: ruled page with a live register (ticks written in, late highlighted, receipt stamped PAID, notice pinned) + form. Mobile: logo + form |
| Demo accounts | Three text buttons | Role cards with icons and a selected state |
| Sidebar | Solid navy | Frosted notebook margin with the red double rule; active item marked with a sliding highlighter |
| Stat tiles | Joined strip | Index cards: label, red header rule, figure; optional visual (attendance ring with a 75% notch) |
| Toasts | Custom | Sonner: swipe/flick to dismiss, stacked, pause on hover; same `useToast()` API |
| Avatar | Paste an https URL | Upload, drag-and-drop or paste (Ctrl+V), round crop with zoom, resized in the browser to 256×256 WebP (~20 KB) |
| Receipts | Plain | Logo, margin rule and a PAID stamp (also in print) |
| Empty states | Text | A blank register row above the message |
| Emails | Navy header | Ink-blue header with the E mark and margin rule |
| Bundle | One 565 KB chunk | Route-level code splitting: first load 311 KB |

## Avatar storage

`PUT /api/v1/auth/me/avatar` takes the raw image bytes (max 300 KB). The type is detected from
the file's magic bytes, so a renamed file or HTML is rejected. Photos live in their own
`avatars` collection (user documents stay small) and are served from
`/api/v1/avatars/:userId/:key.webp` with `Cache-Control: immutable`. `key` is random and
changes on every upload, so URLs can't be guessed and old ones stop working.
`DELETE /api/v1/auth/me/avatar` removes it.
