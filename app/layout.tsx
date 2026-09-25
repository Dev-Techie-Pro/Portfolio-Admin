import './globals.css';

export const metadata = {
  title: 'Portfolio Admin',
  icons: {
    icon: [{ url: '/images/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/images/favicon.svg',
    apple: '/images/favicon.svg',
  },
  manifest: '/images/site.webmanifest',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                'window.addEventListener("pageshow",function(e){if(e.persisted)window.location.reload();});',
            }}
          />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Outfit:wght@400;500;600;700;800&display=swap"
        />
        <link rel="modulepreload" href="/js/main.js" />
        {/* Static public scripts — plain tags avoid Next.js preload warnings */}
        <script src="/js/prefetch-config.js" />
        <script src="/js/boot-prefetch.js" />
        <script src="/js/body-loader-template.js" />
      </head>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname;if(/\\/(login|forget-password|reset-password)(\\/|$)/.test(p)){document.documentElement.classList.add('pa-auth-route');}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
