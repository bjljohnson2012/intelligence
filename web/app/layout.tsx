import type { Metadata } from 'next';
import { Red_Hat_Display, Red_Hat_Text } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

const display = Red_Hat_Display({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const text = Red_Hat_Text({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-text' });

export const metadata: Metadata = {
  title: 'MB Intelligence',
  description: 'Ministry Brands market intelligence for planning. Live Core stays HOLD.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${text.variable} font-sans`}>{children}</body>
    </html>
  );
}
