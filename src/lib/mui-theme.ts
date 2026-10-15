import { nbNO as coreNbNO } from '@mui/material/locale';
import { createTheme, type ThemeOptions } from '@mui/material/styles';

// <Button variant="pill">: a rounded, outlined button for choices, e.g. answer options in a chat.
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    pill: true;
  }
}

const tokens = {
  background: '#F1FAEE',
  foreground: '#1D3557',
  secondaryAccent: '#A8DADC', // secondary/accent, light mode
  // Darker and lighter than the brand red #E63946, which is below 4.5:1 for text on both themes.
  destructive: '#C92A37', // 5.1:1 on the light background
  destructiveDark: '#FF7A82', // 4.9:1 on the dark background and cards
  ringSecondaryDarkChart3: '#457B9D',
  // A shade darker than #457B9D, so light text on it reaches 4.5:1 (it was 4.3:1).
  secondaryDark: '#3F7293',

  // approximated from oklch, no hex comment in source
  muted: '#C8E9E8',
  mutedForeground: '#2E485E',
  border: '#9CBEC9',
  chart5: '#5DAEAE',
  darkCard: '#153758',
  darkSidebar: '#07162A',
};

const themeOptions: ThemeOptions = {
  cssVariables: {
    // matches next-themes putting `class="dark"` on <html> (attribute="class" in your ThemeProvider)
    colorSchemeSelector: 'class',
  },
  shape: {
    // mirrors --radius: 0.625rem
    borderRadius: 10,
  },
  typography: {
    // matches the --font-geist-sans variable set on <html> in layout.tsx
    fontFamily: 'var(--font-geist-sans, ui-sans-serif, system-ui, sans-serif)',
  },
  components: {
    MuiButton: {
      variants: [
        {
          props: { variant: 'pill' },
          style: ({ theme }) => ({
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${theme.vars.palette.divider}`,
            padding: theme.spacing(0.75, 2),
            color: theme.vars.palette.text.primary,
            '&:hover': {
              borderColor: theme.vars.palette.primary.main,
              backgroundColor: theme.vars.palette.action.hover,
            },
            '&.Mui-disabled': {
              borderColor: theme.vars.palette.action.disabledBackground,
            },
          }),
        },
      ],
    },
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: tokens.foreground, // #1D3557
          contrastText: tokens.background,
        },
        secondary: {
          main: tokens.secondaryAccent, // #A8DADC
          contrastText: tokens.foreground,
        },
        error: {
          main: tokens.destructive, // #C92A37
          contrastText: '#FFFFFF',
        },
        background: {
          default: tokens.background,
          paper: tokens.background,
        },
        text: {
          primary: tokens.foreground,
          secondary: tokens.mutedForeground,
        },
        divider: tokens.border,
      },
    },
    dark: {
      palette: {
        primary: {
          main: tokens.secondaryAccent, // #A8DADC, swaps role in dark mode
          contrastText: tokens.foreground,
        },
        secondary: {
          main: tokens.secondaryDark, // #3F7293
          contrastText: tokens.background,
        },
        error: {
          main: tokens.destructiveDark, // #FF7A82
          contrastText: tokens.foreground,
        },
        background: {
          default: tokens.foreground, // #1D3557
          paper: tokens.darkCard,
        },
        text: {
          primary: tokens.background,
          secondary: tokens.border,
        },
        divider: tokens.ringSecondaryDarkChart3,
      },
    },
  },
  // MUI's defaults for these are a faded grey below 4.5:1 against our backgrounds.
  components: {
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({ color: theme.vars.palette.text.secondary }),
      },
    },
    // The helper text of a disabled field still says something, such as why it is locked.
    MuiFormHelperText: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-disabled': { color: theme.vars.palette.text.secondary },
        }),
      },
    },
  },
};

// nbNO translates MUI's own texts (pagination, menus, aria labels) into Norwegian bokmål.
const theme = createTheme(themeOptions, coreNbNO);

export default theme;
