import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { AuthProvider } from '@/components/login/AuthProvider';
import { Navbar } from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeRegistry } from '@/components/ThemeRegistry';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Interviewer Agent Configurator',
  description: 'Configure AI interviewer agents for job interview practice in VR.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables must stay on <html>: globals.css sets font-family
    // there, so defining them on <body> would leave it on the fallback font.
    <html
      lang="nb"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeRegistry>
            <AuthProvider>
              <Navbar />
              <main>{children}</main>
            </AuthProvider>
          </ThemeRegistry>
        </ThemeProvider>
      </body>
    </html>
  );
}
