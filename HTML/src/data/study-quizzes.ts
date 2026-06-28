import fs from "fs";
import path from "path";
import { normalizeQuizAnswers } from "@/data/study-quiz-normalize";
import type { LoadedQuiz, QuizSummary, StudyQuiz, StudyQuizAnswers } from "@/data/study-quizzes-types";

export type {
  QuizOption,
  StudyQuizQuestion,
  StudyQuiz,
  StudyQuizAnswer,
  StudyQuizAnswerRaw,
  StudyQuizAnswers,
  LoadedQuiz,
  QuizSummary,
} from "@/data/study-quizzes-types";

export { normalizeQuizAnswers };

function studyLabDir(): string {
  const candidates = [
    path.join(process.cwd(), "study-lab"),
    path.join(process.cwd(), "HTML", "study-lab"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

/** Nights that have both night-N-quiz.json and night-N-quiz-answers.json */
export function listQuizNights(): number[] {
  const dir = studyLabDir();
  if (!fs.existsSync(dir)) return [];

  const nights = new Set<number>();
  for (const file of fs.readdirSync(dir)) {
    const match = file.match(/^night-(\d+)-quiz\.json$/);
    if (!match) continue;
    const night = Number.parseInt(match[1], 10);
    const answersFile = path.join(dir, `night-${night}-quiz-answers.json`);
    if (fs.existsSync(answersFile)) nights.add(night);
  }
  return [...nights].sort((a, b) => a - b);
}

export function loadQuiz(night: number): LoadedQuiz | null {
  const dir = studyLabDir();
  const quizPath = path.join(dir, `night-${night}-quiz.json`);
  const answersPath = path.join(dir, `night-${night}-quiz-answers.json`);
  if (!fs.existsSync(quizPath) || !fs.existsSync(answersPath)) return null;

  const quiz = JSON.parse(fs.readFileSync(quizPath, "utf-8")) as StudyQuiz;
  const answerData = JSON.parse(
    fs.readFileSync(answersPath, "utf-8")
  ) as StudyQuizAnswers;

  const questionCount = quiz.questions.length;
  return {
    night: quiz.night,
    title: quiz.title,
    topic: quiz.topic,
    format: quiz.format,
    questionCount,
    suggestedMinutes: Math.max(1, Math.round((questionCount * 96) / 60)),
    questions: quiz.questions,
    answers: normalizeQuizAnswers(answerData.answers),
  };
}

export function listQuizSummaries(): QuizSummary[] {
  const summaries: QuizSummary[] = [];
  for (const night of listQuizNights()) {
    const quiz = loadQuiz(night);
    if (!quiz) continue;
    summaries.push({
      night: quiz.night,
      title: quiz.title,
      topic: quiz.topic,
      questionCount: quiz.questionCount,
      suggestedMinutes: quiz.suggestedMinutes,
    });
  }
  return summaries;
}
