import { createTheme } from '@mui/material/styles';

const tokens = {
  background: '#F1FAEE',
  foreground: '#1D3557',
  secondaryAccent: '#A8DADC', // secondary/accent, light mode
  destructive: '#E63946',
  ringSecondaryDarkChart3: '#457B9D',

  // approximated from oklch, no hex comment in source
  muted: '#C8E9E8',
  mutedForeground: '#2E485E',
  border: '#9CBEC9',
  chart5: '#5DAEAE',
  darkCard: '#153758',
  darkSidebar: '#07162A',
};

const theme = createTheme({
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
          main: tokens.destructive,
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
          main: tokens.ringSecondaryDarkChart3, // #457B9D
          contrastText: tokens.background,
        },
        error: {
          main: tokens.destructive,
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
});

export default theme;
