# Design guide

<!-- The colour palette, spacing and type scale, and the rules for building screens out of MUI, the shared component library and modular CSS. Read before writing UI code. -->

## Components

- Use **MUI** components for standard controls (buttons, text fields, cards, alerts) and
  **MUI X Data Grid** for tables.
- Change how MUI looks in [`src/lib/mui-theme.ts`](../src/lib/mui-theme.ts): palette, radius
  and font. Its palette mirrors the tokens in `src/app/globals.css`, so a colour change goes
  in both files.
- Layout and anything MUI does not cover goes in the component's own `*.module.css`.
- `src/components/ui/` has a few Radix-based primitives (button, dropdown menu) that are
  still in use.

Background: [decision 0002](decisions/0002-mui-with-css-modules.md).
