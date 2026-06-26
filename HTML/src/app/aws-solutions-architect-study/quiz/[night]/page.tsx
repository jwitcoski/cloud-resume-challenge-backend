import Link from "next/link";
import { notFound } from "next/navigation";
import { listQuizNights, loadQuiz } from "@/data/study-quizzes";
import QuizNightLoader from "../QuizNightLoader";

type PageProps = {
  params: Promise<{ night: string }>;
};

export function generateStaticParams() {
  return listQuizNights().map((night) => ({
    night: String(night),
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { night: nightParam } = await params;
  const night = Number.parseInt(nightParam, 10);
  const quiz = loadQuiz(night);
  if (!quiz) return { title: "Quiz not found" };
  return {
    title: `Night ${quiz.night} Quiz — ${quiz.title} | SAA-C03 Study`,
    description: quiz.topic ?? `Practice quiz for study night ${quiz.night}.`,
  };
}

export default async function StudyQuizNightPage({ params }: PageProps) {
  const { night: nightParam } = await params;
  const night = Number.parseInt(nightParam, 10);
  if (Number.isNaN(night)) notFound();

  // Route exists only for nights known at dev/build start (static export).
  // Quiz JSON is loaded client-side from public/study-lab/ (synced on predev/prebuild).
  if (!loadQuiz(night)) notFound();

  return (
    <main className="min-h-screen bg-[#f4f4f4] text-[#333]">
      <div className="container max-w-3xl mx-auto px-4 sm:px-7 py-10">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6 sm:p-8">
          <Link
            href="/aws-solutions-architect-study/quiz/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6"
          >
            ← All quizzes
          </Link>
          <QuizNightLoader night={night} />
        </div>
      </div>
    </main>
  );
}
