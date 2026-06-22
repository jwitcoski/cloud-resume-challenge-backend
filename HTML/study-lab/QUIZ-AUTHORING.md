# Study lab quiz authoring

When creating or editing `night-*-quiz.json` / `night-*-quiz-answers.json`:

## Answer key distribution (required)

- **Do not** cluster correct answers on one letter (e.g. 12× B on a 15-question quiz).
- Target **roughly equal use of A, B, C, and D** — shuffle option text, not just the key.
- Document distribution in the answer file, e.g. `"answerDistribution": { "A": 4, "B": 3, "C": 4, "D": 4 }`.
- Night 7 (2026-06-20): original draft had 12/15 = B; reshuffled after review.

## Format

- Scenario-style questions; four plausible distractors.
- `"format"` field in quiz JSON: scenario → best service → why not the others.
- Explanations in answers JSON should cite which night/topic the question reinforces.

## Quiz taker (web UI)

- Quizzes render at `/aws-solutions-architect-study/quiz/` — auto-discovers `night-N-quiz.json` + `night-N-quiz-answers.json` at build time.
- Add a new night: drop both JSON files in `study-lab/` and redeploy; no code changes required.

## Existing quizzes to rebalance (backlog)

- `night-5-quiz.json` — audit answer distribution when next edited.
- `night-6-quiz.json` — audit answer distribution when next edited.
