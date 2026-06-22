import Link from "next/link";
import { listQuizSummaries } from "@/data/study-quizzes";

export const metadata = {
  title: "SAA-C03 Practice Quizzes | Jonathan Witcoski",
  description:
    "Timed scenario quizzes from the nightly study lab — auto-loaded from study-lab JSON.",
};

export default function StudyQuizIndexPage() {
  const quizzes = listQuizSummaries();

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
          <p className="leading-relaxed text-[#555] mb-8">
            Interactive quizzes loaded from{" "}
            <code className="bg-[#f4f4f4] px-1 rounded text-xs">
              HTML/study-lab/night-*-quiz.json
            </code>
            . Answers stay hidden until you submit. Progress is saved in your
            browser per night.
          </p>

          {quizzes.length === 0 ? (
            <p className="text-[#666]">
              No quizzes found. Add matching{" "}
              <code className="bg-[#f4f4f4] px-1 rounded text-xs">
                night-N-quiz.json
              </code>{" "}
              and{" "}
              <code className="bg-[#f4f4f4] px-1 rounded text-xs">
                night-N-quiz-answers.json
              </code>{" "}
              under <code className="bg-[#f4f4f4] px-1 rounded text-xs">study-lab/</code>.
            </p>
          ) : (
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
                    {q.topic && (
                      <p className="text-sm text-[#666] mt-1">{q.topic}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
