"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { QuizSummary } from "@/data/study-quizzes-types";
import QuizNightLoader from "./QuizNightLoader";

type QuizIndexClientProps = {
  quizzes: QuizSummary[];
};

export default function QuizIndexClient({ quizzes }: QuizIndexClientProps) {
  const searchParams = useSearchParams();
  const nightParam = searchParams.get("night");
  const night = nightParam ? Number.parseInt(nightParam, 10) : Number.NaN;

  if (!Number.isNaN(night) && night > 0) {
    return (
      <>
        <Link
          href="/aws-solutions-architect-study/quiz/"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6"
        >
          ← All quizzes
        </Link>
        <QuizNightLoader night={night} />
      </>
    );
  }

  if (quizzes.length === 0) {
    return (
      <p className="text-[#666]">
        No quizzes found. Add matching{" "}
        <code className="bg-[#f4f4f4] px-1 rounded text-xs">night-N-quiz.json</code> and{" "}
        <code className="bg-[#f4f4f4] px-1 rounded text-xs">
          night-N-quiz-answers.json
        </code>{" "}
        under <code className="bg-[#f4f4f4] px-1 rounded text-xs">study-lab/</code>, then
        restart <code className="bg-[#f4f4f4] px-1 rounded text-xs">npm run dev</code>.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {quizzes.map((q) => (
        <li key={q.night}>
          <Link
            href={`/aws-solutions-architect-study/quiz/${q.night}/`}
            className="block rounded-lg border border-[#ddd] p-4 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-[#444]">
                Night {q.night}: {q.title}
              </h2>
              <span className="text-sm text-[#888] whitespace-nowrap">
                {q.questionCount} questions · ~{q.suggestedMinutes} min
              </span>
            </div>
            {q.topic && <p className="text-sm text-[#666] mt-1">{q.topic}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
