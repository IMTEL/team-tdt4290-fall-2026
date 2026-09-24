'use client';

import * as React from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider, useColorScheme } from '@mui/material/styles';
import theme from '@/lib/mui-theme';

// MUI's ThemeProvider tracks its own color-scheme mode once it's given
// light + dark schemes — defaulting to the OS preference — separately from
// next-themes. Left alone, the two fight over the `.dark` class on <html>,
// which is why refreshing could snap back to the system's dark preference
// even with light selected in the dropdown. This keeps next-themes as the
// single source of truth and mirrors its resolved value into MUI.
function MuiThemeSync() {
  const { resolvedTheme } = useNextTheme();
  const { setMode } = useColorScheme();

  React.useEffect(() => {
    if (resolvedTheme === 'light' || resolvedTheme === 'dark') {
      setMode(resolvedTheme);
    }
  }, [resolvedTheme, setMode]);

  return null;
}

// No <CssBaseline /> here on purpose — globals.css already ships its own
// reset (see the comment at the top of that file). Adding MUI's would
// fight it: different box-sizing origin, different margin resets.
export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        <MuiThemeSync />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
