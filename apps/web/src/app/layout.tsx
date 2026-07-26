import './global.css';
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
      <body>{children}</body>
    </html>
  );
}
