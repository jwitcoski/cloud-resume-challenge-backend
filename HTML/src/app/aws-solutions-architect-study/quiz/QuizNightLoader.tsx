"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LoadedQuiz, StudyQuiz, StudyQuizAnswers } from "@/data/study-quizzes";
import { normalizeQuizAnswers } from "@/data/study-quizzes";
import QuizTaker from "./QuizTaker";

type QuizNightLoaderProps = {
  night: number;
};

export default function QuizNightLoader({ night }: QuizNightLoaderProps) {
  const [quiz, setQuiz] = useState<LoadedQuiz | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setQuiz(null);
      setError(null);
      try {
        const [quizRes, answersRes] = await Promise.all([
          fetch(`/study-lab/night-${night}-quiz.json`),
          fetch(`/study-lab/night-${night}-quiz-answers.json`),
        ]);

        if (!quizRes.ok || !answersRes.ok) {
          if (!cancelled) {
            setError(
              `Quiz files for night ${night} were not found. Run npm run dev from the HTML folder (restarts pick up new nights).`
            );
          }
          return;
        }

        const quizData = (await quizRes.json()) as StudyQuiz;
        const answerData = (await answersRes.json()) as StudyQuizAnswers;
        const questionCount = quizData.questions.length;

        if (!cancelled) {
          setQuiz({
            night: quizData.night,
            title: quizData.title,
            topic: quizData.topic,
            format: quizData.format,
            questionCount,
            suggestedMinutes: Math.max(1, Math.round((questionCount * 96) / 60)),
            questions: quizData.questions,
            answers: normalizeQuizAnswers(answerData.answers),
          });
        }
      } catch {
        if (!cancelled) {
          setError("Could not load quiz JSON. Try refreshing after npm run dev restarts.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [night]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[#666] mb-4">{error}</p>
        <Link
          href="/aws-solutions-architect-study/quiz/"
          className="text-sm text-primary hover:underline"
        >
          ← All quizzes
        </Link>
      </div>
    );
  }

  if (!quiz) {
    return <p className="text-sm text-[#666] py-8 text-center">Loading quiz…</p>;
  }

  return <QuizTaker quiz={quiz} />;
}
