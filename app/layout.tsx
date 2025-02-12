import type { Metadata } from 'next';
import { Barriecito } from 'next/font/google';
import './globals.css';

const barriecito = Barriecito({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-barriecito',
});

export const metadata: Metadata = {
  title: "quantizor's lab",
  description: 'Personal website of Evan Jacobs',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={barriecito.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
