"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LoadedQuiz, QuizOption } from "@/data/study-quizzes";

const OPTIONS: QuizOption[] = ["A", "B", "C", "D"];

type Phase = "take" | "results";

type QuizTakerProps = {
  quiz: LoadedQuiz;
};

function storageKey(night: number): string {
  return `saa-quiz-progress-night-${night}`;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuizTaker({ quiz }: QuizTakerProps) {
  const [phase, setPhase] = useState<Phase>("take");
  const [selections, setSelections] = useState<Record<string, QuizOption>>({});
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);

  const answerMap = useMemo(
    () => new Map(quiz.answers.map((a) => [a.id, a])),
    [quiz.answers]
  );

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey(quiz.night));
      if (raw) {
        const parsed = JSON.parse(raw) as {
          selections?: Record<string, QuizOption>;
          phase?: Phase;
          elapsed?: number;
        };
        if (parsed.selections) setSelections(parsed.selections);
        if (parsed.phase === "results") setPhase("results");
        if (typeof parsed.elapsed === "number") setElapsed(parsed.elapsed);
      }
    } catch {
      /* ignore */
    }
  }, [quiz.night]);

  useEffect(() => {
    if (!mounted || phase !== "take") return;
    const id = window.setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [mounted, phase]);

  const persist = useCallback(
    (nextSelections: Record<string, QuizOption>, nextPhase: Phase) => {
      localStorage.setItem(
        storageKey(quiz.night),
        JSON.stringify({ selections: nextSelections, phase: nextPhase })
      );
    },
    [quiz.night]
  );

  const answeredCount = Object.keys(selections).length;
  const allAnswered = answeredCount === quiz.questions.length;

  const score = useMemo(() => {
    let correct = 0;
    for (const q of quiz.questions) {
      const picked = selections[q.id];
      const key = answerMap.get(q.id);
      if (picked && key && picked === key.answer) correct += 1;
    }
    return correct;
  }, [quiz.questions, selections, answerMap]);

  const pick = (questionId: string, option: QuizOption) => {
    if (phase === "results") return;
    const next = { ...selections, [questionId]: option };
    setSelections(next);
    persist(next, "take");
  };

  const submit = () => {
    if (!allAnswered) return;
    setPhase("results");
    persist(selections, "results");
    localStorage.setItem(
      storageKey(quiz.night),
      JSON.stringify({ selections, phase: "results", elapsed })
    );
  };

  const reset = () => {
    setSelections({});
    setPhase("take");
    setElapsed(0);
    localStorage.removeItem(storageKey(quiz.night));
  };

  const suggestedSeconds = quiz.suggestedMinutes * 60;
  const overSuggested = phase === "take" && elapsed > suggestedSeconds;

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 sm:-mx-8 px-6 sm:px-8 py-3 mb-6 bg-white/95 backdrop-blur border-b border-[#eee]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#888]">
              Night {quiz.night}
            </p>
            <h1 className="text-xl font-bold text-[#444]">{quiz.title}</h1>
            {quiz.topic && (
              <p className="text-sm text-[#666] mt-0.5">{quiz.topic}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {phase === "take" && (
              <span
                className={`rounded border px-2.5 py-1 font-mono tabular-nums ${
                  overSuggested
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-[#ddd] bg-[#fafafa] text-[#555]"
                }`}
              >
                {formatTime(elapsed)} / ~{quiz.suggestedMinutes}m
              </span>
            )}
            {phase === "results" && (
              <span className="rounded border border-green-200 bg-green-50 px-2.5 py-1 font-semibold text-green-800">
                {score}/{quiz.questionCount}
              </span>
            )}
            <span className="rounded border border-[#ddd] bg-[#fafafa] px-2.5 py-1 text-[#555]">
              {answeredCount}/{quiz.questionCount} answered
            </span>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{
              width: `${(answeredCount / quiz.questionCount) * 100}%`,
            }}
          />
        </div>
      </div>

      {phase === "take" && quiz.format && (
        <p className="text-sm text-[#666] mb-6 leading-relaxed">{quiz.format}</p>
      )}

      {phase === "results" && (
        <div className="mb-6 rounded-lg border border-[#ddd] bg-[#fafafa] p-4">
          <p className="text-lg font-semibold text-[#444]">
            Score: {score}/{quiz.questionCount} (
            {Math.round((score / quiz.questionCount) * 100)}%)
          </p>
          <p className="text-sm text-[#666] mt-1">
            Time: {formatTime(elapsed)} · Suggested ~{quiz.suggestedMinutes} min
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              Retake quiz
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/aws-solutions-architect-study/quiz/">
                All quizzes
              </Link>
            </Button>
          </div>
        </div>
      )}

      <ol className="space-y-8 list-none p-0 m-0">
        {quiz.questions.map((q, index) => {
          const picked = selections[q.id];
          const key = answerMap.get(q.id);
          const isResults = phase === "results";
          const isCorrect = isResults && picked === key?.answer;
          const isWrong = isResults && picked && picked !== key?.answer;

          return (
            <li
              key={q.id}
              id={q.id}
              className={`rounded-lg border p-4 sm:p-5 scroll-mt-36 ${
                isCorrect
                  ? "border-green-200 bg-green-50/50"
                  : isWrong
                    ? "border-red-200 bg-red-50/50"
                    : "border-[#ddd] bg-white"
              }`}
            >
              <p className="font-medium text-[#444] mb-4 leading-relaxed">
                <span className="text-[#888] mr-2">{index + 1}.</span>
                {q.question}
              </p>
              <div className="space-y-2">
                {OPTIONS.map((letter) => {
                  const selected = picked === letter;
                  const isAnswer = isResults && key?.answer === letter;
                  const showWrongPick = isResults && selected && !isAnswer;

                  let optionClass =
                    "w-full text-left rounded-md border px-3 py-2.5 text-sm leading-snug transition-colors ";
                  if (isResults) {
                    if (isAnswer) {
                      optionClass +=
                        "border-green-400 bg-green-100 text-green-900 font-medium";
                    } else if (showWrongPick) {
                      optionClass +=
                        "border-red-300 bg-red-100 text-red-900 line-through";
                    } else {
                      optionClass += "border-[#e5e5e5] bg-[#fafafa] text-[#666]";
                    }
                  } else if (selected) {
                    optionClass +=
                      "border-blue-500 bg-blue-50 text-[#333] ring-1 ring-blue-500";
                  } else {
                    optionClass +=
                      "border-[#ddd] bg-white text-[#444] hover:border-blue-300 hover:bg-blue-50/40";
                  }

                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={isResults}
                      onClick={() => pick(q.id, letter)}
                      className={optionClass}
                    >
                      <span className="font-semibold mr-2">{letter}.</span>
                      {q.options[letter]}
                    </button>
                  );
                })}
              </div>
              {isResults && key?.explanation && (
                <p className="mt-4 text-sm text-[#555] leading-relaxed border-t border-[#e5e5e5] pt-3">
                  <strong className="text-[#444]">
                    {isCorrect ? "Correct." : `Answer: ${key.answer}.`}
                  </strong>{" "}
                  {key.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {phase === "take" && (
        <div className="mt-8 flex flex-wrap items-center gap-3 sticky bottom-4">
          <Button type="button" onClick={submit} disabled={!allAnswered}>
            Submit answers
          </Button>
          {!allAnswered && (
            <p className="text-sm text-[#888]">
              Answer all {quiz.questionCount} questions to submit.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
