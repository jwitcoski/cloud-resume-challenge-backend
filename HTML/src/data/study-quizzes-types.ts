export type QuizOption = "A" | "B" | "C" | "D";

export type StudyQuizQuestion = {
  id: string;
  question: string;
  options: Record<QuizOption, string>;
};

export type StudyQuiz = {
  night: number;
  title: string;
  topic?: string;
  format?: string;
  answerKey?: string;
  questions: StudyQuizQuestion[];
};

export type StudyQuizAnswer = {
  id: string;
  answer: QuizOption;
  explanation: string;
};

/** Raw JSON may use "answer" (nights 5–15) or "correct" (nights 16+). */
export type StudyQuizAnswerRaw = {
  id: string;
  answer?: QuizOption;
  correct?: QuizOption;
  explanation: string;
};

export type StudyQuizAnswers = {
  night: number;
  title: string;
  answers: StudyQuizAnswerRaw[];
};

export type LoadedQuiz = {
  night: number;
  title: string;
  topic?: string;
  format?: string;
  questionCount: number;
  /** ~96 sec per question — SAA study pace */
  suggestedMinutes: number;
  questions: StudyQuizQuestion[];
  answers: StudyQuizAnswer[];
};

export type QuizSummary = {
  night: number;
  title: string;
  topic?: string;
  questionCount: number;
  suggestedMinutes: number;
};
