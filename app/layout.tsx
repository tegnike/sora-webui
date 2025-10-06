import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sora2 | Video Generator',
  description: 'Generate videos with OpenAI Sora',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
