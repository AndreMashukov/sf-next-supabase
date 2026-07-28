import { AppShell } from '@/components/AppShell';

export default function QuizzesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
