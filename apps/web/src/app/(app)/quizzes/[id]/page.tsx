import { notFound } from 'next/navigation';
import { getQuizById } from '@/data/quizzes';
import { QuizPageClient } from './_components/QuizPageClient';

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
