import { notFound } from 'next/navigation';
import { getQuizById } from '@/lib/data/quizzes';
import { QuizPageClient } from './QuizPageClient';

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await getQuizById(id);

  if (!quiz) {
    notFound();
  }

  return <QuizPageClient quiz={quiz} />;
}
