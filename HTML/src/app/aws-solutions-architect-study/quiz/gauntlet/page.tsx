import Link from "next/link";
import { listGuideNights } from "@/data/study-guides";
import { loadAllQuizzes } from "@/data/study-quizzes";
import GauntletTaker from "./GauntletTaker";

export const metadata = {
  title: "SAA-C03 Quiz Gauntlet | Jonathan Witcoski",
  description:
    "Clear every study-lab quiz with one correct answer per night — miss and stay on that night until you get one right.",
};

export default function QuizGauntletPage() {
  const quizzes = loadAllQuizzes();
  const guideNights = listGuideNights();

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
          <GauntletTaker quizzes={quizzes} guideNights={guideNights} />
        </div>
      </div>
    </main>
  );
}
