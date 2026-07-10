import Link from "next/link";
import { Suspense } from "react";
import { listQuizSummaries } from "@/data/study-quizzes";
import { listGuideNights } from "@/data/study-guides";
import QuizIndexClient from "./QuizIndexClient";

export const metadata = {
  title: "SAA-C03 Practice Quizzes | Jonathan Witcoski",
  description:
    "Timed scenario quizzes from the nightly study lab — baked in at build from study-lab JSON.",
};

export default function StudyQuizIndexPage() {
  const quizzes = listQuizSummaries();
  const guideNights = listGuideNights();

  return (
    <main className="min-h-screen bg-[#f4f4f4] text-[#333]">
      <div className="container max-w-3xl mx-auto px-4 sm:px-7 py-10">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6 sm:p-8">
          <Link
            href="/aws-solutions-architect-study/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-8"
          >
            ← Back to study plan
          </Link>

          <p className="text-sm uppercase tracking-widest text-[#666] mb-2">
            Study lab
          </p>
          <h1 className="text-3xl font-bold text-[#444] mb-3">
            SAA-C03 practice quizzes
          </h1>
          <p className="leading-relaxed text-[#555] mb-4">
            Interactive quizzes from{" "}
            <code className="bg-[#f4f4f4] px-1 rounded text-xs">
              HTML/study-lab/night-*-quiz.json
            </code>
            , embedded when the site is built. Answers stay hidden until you submit.
            Progress is saved in your browser per night.
          </p>

          {quizzes.length > 0 && (
            <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-[#444]">Quiz gauntlet</p>
                <p className="text-sm text-[#555] mt-0.5 leading-relaxed">
                  One correct answer clears a night. Miss and you stay on that night
                  until you get one right — progress through every quiz.
                </p>
              </div>
              <Link
                href="/aws-solutions-architect-study/quiz/gauntlet/"
                className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
              >
                Start gauntlet →
              </Link>
            </div>
          )}

          {guideNights.length > 0 && (
            <p className="leading-relaxed text-[#555] mb-8">
              <Link
                href="/aws-solutions-architect-study/guide/"
                className="text-emerald-700 hover:underline font-medium"
              >
                Nightly study guides →
              </Link>{" "}
              — read the markdown notes before each quiz.
            </p>
          )}

          <Suspense fallback={<p className="text-sm text-[#666]">Loading…</p>}>
            <QuizIndexClient quizzes={quizzes} guideNights={guideNights} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
