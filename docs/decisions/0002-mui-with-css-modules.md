# 0002. MUI with CSS Modules for the UI

- **Status:** Accepted
- **Date:** 2026-09-22

## Context

The project started with Next.js 16, CSS Modules and a small set of our own primitives in
`src/components/ui/` built on headless Radix components. As we built the screens (agent list,
chats, login, template picker), we needed tables, form fields, cards and alerts that are
accessible and translated out of the box. Writing all of those ourselves would cost time we
would rather spend on the configurator.

## Decision

- **Next.js 16** (App Router) stays the frontend framework, not plain React + Vite.
- **MUI** (Material UI, styled with Emotion) is our component library. **MUI X Data Grid** is
  used for tables. MUI's texts use the Norwegian bokmål locales.
- **CSS Modules** stay for layout and anything MUI does not cover, one `*.module.css` per
  component.
- The Radix-based primitives in `src/components/ui/` (button, dropdown menu) stay where they
  are already used. New UI should use MUI.
- Colours are defined once as tokens in `src/app/globals.css` and mirrored into the MUI palette
  in `src/lib/mui-theme.ts`. `next-themes` controls dark mode, and `ThemeRegistry.tsx` keeps
  MUI's colour scheme in sync with it.

## Consequences

- Two styling systems live side by side (Emotion inside MUI, CSS Modules for our own code).
  Change how MUI components look through the theme, not with per-page overrides.
- A colour change must be made in both `globals.css` and `mui-theme.ts`.
- We do not use MUI's `CssBaseline`, because `globals.css` has its own reset.
- RAGdollChat's UI (Tailwind + shadcn) is still not reused, see
  [0001](0001-own-chat-component.md).
