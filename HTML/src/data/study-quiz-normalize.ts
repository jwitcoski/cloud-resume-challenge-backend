import type { StudyQuizAnswer, StudyQuizAnswerRaw } from "@/data/study-quizzes-types";

/** Accept answer keys using either "answer" or "correct" field names. */
export function normalizeQuizAnswers(
  raw: StudyQuizAnswerRaw[]
): StudyQuizAnswer[] {
  return raw.map((entry) => {
    const answer = entry.answer ?? entry.correct;
    if (!answer) {
      throw new Error(`Quiz answer ${entry.id} missing "answer" or "correct"`);
    }
    return { id: entry.id, answer, explanation: entry.explanation };
  });
}
