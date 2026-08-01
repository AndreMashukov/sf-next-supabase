import 'katex/dist/katex.min.css';
import './global.css';
import './directory-ui-parity.css';
import './quiz-ui-parity.css';
import './document-ui-parity.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StudyForge Quiz',
  description: 'Create documents and generate quizzes from them',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
