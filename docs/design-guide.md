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

## Tokens

The tokens live in `:root` in [`src/app/globals.css`](../src/app/globals.css). Use them instead
of raw values in `*.module.css`:

- **Spacing**: `--space-1` … `--space-6` (0.25, 0.5, 0.75, 1, 1.5 and 2rem) for gaps, padding
  and margins.
- **Radius**: `--radius-sm` … `--radius-xl`, and `--radius-full` for pills.
- **Colour, shadow and motion**: `--primary`, `--muted-foreground`, `--shadow-sm`,
  `--duration` and so on.

A size that only one component needs, such as the width of a field, goes in a named custom
property at the top of that component's CSS module, not as a bare number further down.
Media queries can't read CSS variables, so they use MUI's breakpoints (`sm` is 600px) with a
comment.

## Colours and contrast

Text must have a contrast of at least 4.5:1 against its background (WCAG 2.1 AA, required by
universell utforming), in both themes. The accessibility e2e tests
([`docs/e2e-testing.md`](e2e-testing.md#accessibility)) fail when it doesn't.

Two brand colours are too weak for text, so the app uses a shade of them instead:

| Use                                                 | Brand     | Light theme | Dark theme |
| --------------------------------------------------- | --------- | ----------- | ---------- |
| Error and delete (`--destructive`, MUI `error`)     | `#E63946` | `#C92A37`   | `#FF7A82`  |
| Secondary and accent in dark (`--secondary`, chips) | `#457B9D` | unchanged   | `#3F7293`  |

In the dark theme the delete button has dark text (`#1D3557`) on the light red. Before you add or
change a colour, check its contrast, for example with the
[WebAIM contrast checker](https://webaim.org/resources/contrastchecker/).
