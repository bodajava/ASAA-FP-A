import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui/toast';
import { I18nProvider } from '@/lib/i18n/i18n-context';
import { ThemeProvider } from '@/lib/theme/theme-context';
import { QueryProvider } from '@/components/query-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Harvest — Financial Planning & Analysis',
    template: '%s | Harvest',
  },
  description:
    'Enterprise Financial Planning & Analysis platform for budgeting, forecasting, and reporting.',
  robots: { index: false, follow: false },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Harvest',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="theme-color"
          content="#059669"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#0f172a"
          media="(prefers-color-scheme: dark)"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('asaa_theme') || 'system';
                var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) document.documentElement.classList.add('dark');
                var locale = localStorage.getItem('asaa_locale') || 'en';
                document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = locale;
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <QueryProvider>
                <ToastProvider>{children}</ToastProvider>
              </QueryProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
