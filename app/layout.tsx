import type { Metadata } from 'next';

import './globals.css';
import Nav from './nav';

export const metadata: Metadata = {
  title: "quantizor's lab",
  description: 'Personal website of Evan Jacobs, TypeScript engineer and engineering consultant.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>
        <Nav />

        {children}
      </body>
    </html>
  );
}
