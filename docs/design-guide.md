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

## Shared components

Before you build something for one page, check whether it exists. These are meant to be reused;
everything else in a page's folder belongs to that page.

**Basics** (`src/components/ui/` and `src/components/`)

| Component                          | Use it for                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `FieldHelp`                        | The question mark beside a field: hover, focus or tap to read what it is for. Give it the field's `label` |
| `ScrollArea`                       | A box with a fixed height that scrolls, with a scrollbar always shown and keyboard focus                  |
| `Button`, `DropdownMenu`           | The Radix-based button and menu, only used by `ThemeToggle`. Use MUI's `Button` and `Menu` in new code    |
| MUI `Button` with `variant="pill"` | Round, light buttons such as answer options in a chat (defined in `src/lib/mui-theme.ts`)                 |
| `Navbar`, `ThemeToggle`            | The top bar and the light, dark or system theme switch. There is one of each, in the root layout          |

**Agents** (`src/components/agents/`)

| Component                        | Use it for                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `AgentCardGrid`, `AgentCard`     | The grid of cards on Agenter and Min profil (one column on a phone, up to four on a wide screen)         |
| `NewAgentCard`, `DraftAgentCard` | The «Ny agent» card first in the grid, and one card per local draft                                      |
| `AgentStatusChip`                | The Utkast / Privat / Publisert pill                                                                     |
| `AgentAvatar`, `AvatarPicker`    | An agent's picture, and choosing one (radio buttons, so the keyboard works)                              |
| `AgentFilters`                   | The filter fields above the agent list                                                                   |
| `AgentTypePicker`                | Choosing the agent type, with planned types shown as «Kommer snart»                                      |
| `AnswerList`, `AnswerEffects`    | An agent's answers as label and value, and «Slik former svarene dine agenten»                            |
| `AdvancedSettingsFields`         | Language model, temperature and, when editing, a hand-written prompt. `allowCustomPrompt` turns that off |
| `PublishToCandidateDialog`       | The public name and description before publishing, on the wizard's last step and on the agent page       |

**Chat** (`src/components/chat/`)

| Component                  | Use it for                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentChat`                | A whole chat with an agent: give it the first messages (`initialMessages`) and a `send` function. Used by the test chat and the configuration chat |
| `MessageList`, `ChatInput` | Its parts, if a page needs them on their own                                                                                                       |
| `QuestionOptions`          | Answer options from an `[ALTERNATIVER: …]` block as buttons or checkboxes                                                                          |

**Templates** (`src/components/templates/`, `legalTemplates/`, `profiles/`)

| Component                                                                                     | Use it for                                                                                   |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `CatalogGrid`, `CatalogCard`, `AddCatalogCard`                                                | The cards on Maler, shaped like agent cards, with a dashed «Ny …» card first                 |
| `TemplatePicker`, `IndustryPicker`                                                            | Choosing an intervjuermal or a stillingsmal, with «Fortsett uten mal»                        |
| `TemplateDetail`                                                                              | A template's details page; built-in ones get the «Følger med appen» mark and no edit buttons |
| `TemplateForm`, `JobTemplateForm`, `IndustryTemplateForm`, `ProfileForm`, `LegalTemplateForm` | The forms for each kind, used both for new and for saved ones (pass `initial`)               |
| `LegalTemplateSelect`, `LegalParagraphPicker`, `ProfileSelect`                                | Ticking legal templates, ticking paragraphs, and choosing a jobbsøkermal                     |
| `Delete…Button` (one per kind)                                                                | Delete with a confirmation dialog that stays open and shows the error if deleting fails      |

**Wizard** (`src/app/configure/`, shared by the steps but not outside the wizard)

| Component                                          | Use it for                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `WizardFrame`, `WizardNav` (in `StillingStep.tsx`) | The step bar, the template bubbles, **Tilbake**/**Neste** and **Lagre utkast** around a step |
| `ChoiceSummary`                                    | The short «what you chose» lines under a step                                                |
| `TemplatePeekBubbles`                              | The bubbles for the chosen templates beside the steps                                        |
| `LeaveWizardGuard`                                 | Asking before a link leaves the wizard without saving                                        |

**Patterns without a component**

- **A short message after moving to another page** (such as «Agent lagret»): set a flash with
  `setFlash` in `src/lib/flash.ts` before navigating, and show it in an MUI `Snackbar` on the next
  page (see `src/app/browse-agents/flash.ts`).
- **Going somewhere and coming back** (such as «Lag en ny mal» from the wizard): add `returnTo`
  with `withReturnTo` and read it with `returnPath` (`src/lib/returnTo.ts`), which drops anything
  that would leave the site.
- **Reading browser storage** (drafts, flashes): wait for `useIsClient` or `useOnceInBrowser`
  (`src/lib/useOnceInBrowser.ts`), so the server and the browser render the same HTML.
- **Errors from our API**: the `api.ts` next to each component group turns a status into a
  Norwegian message. Never show the server's own text.

## Tokens

The tokens live in `:root` in [`src/app/globals.css`](../src/app/globals.css). Use them instead
of raw values in `*.module.css`:

- **Spacing**: `--space-1` … `--space-6` (0.25, 0.5, 0.75, 1, 1.5 and 2rem) for gaps, padding
  and margins.
- **Radius**: `--radius-sm` … `--radius-xl`, and `--radius-full` for pills.
- **Colour, shadow and motion**: `--primary`, `--muted-foreground`, `--shadow-sm`,
  `--duration` and so on.
- **Font sizes**: there are no font-size tokens yet. Use MUI's `Typography` variants (`h1` …
  `body2`, `caption`) where you can; in a CSS module, use `rem` and one of the sizes already in
  use (0.75, 0.875, 1, 1.125, 1.25 and 1.5rem) rather than a new one.

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
