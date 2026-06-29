"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { QuizSummary } from "@/data/study-quizzes-types";

type QuizIndexClientProps = {
  quizzes: QuizSummary[];
  guideNights?: number[];
};

export default function QuizIndexClient({ quizzes, guideNights = [] }: QuizIndexClientProps) {
  const guideSet = new Set(guideNights);
  const searchParams = useSearchParams();
  const router = useRouter();
  const nightParam = searchParams.get("night");
  const night = nightParam ? Number.parseInt(nightParam, 10) : Number.NaN;

  useEffect(() => {
    if (!Number.isNaN(night) && night > 0) {
      router.replace(`/aws-solutions-architect-study/quiz/${night}/`);
    }
  }, [night, router]);

  if (!Number.isNaN(night) && night > 0) {
    return <p className="text-sm text-[#666] py-8 text-center">Loading quiz…</p>;
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
          <div className="rounded-lg border border-[#ddd] p-4 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
            <Link href={`/aws-solutions-architect-study/quiz/${q.night}/`}>
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
            {guideSet.has(q.night) && (
              <p className="text-sm mt-2">
                <Link
                  href={`/aws-solutions-architect-study/guide/${q.night}/`}
                  className="text-emerald-700 hover:underline"
                >
                  Read study guide first →
                </Link>
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
