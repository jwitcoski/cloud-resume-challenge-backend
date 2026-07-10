# Study lab quiz authoring

When creating or editing `night-*-quiz.json` / `night-*-quiz-answers.json`:

## Option length (required)

- **Do not** make the correct answer consistently the longest option — readers can guess without reading content.
- Keep all four options **roughly similar length** (pad distractors with plausible detail, or trim correct answers).
- Night 13 (2026-06-25): original draft had correct answer longest on 15/15 questions; rebalanced after review.

## Answer key distribution (required)

- **Do not** cluster correct answers on one letter (e.g. 12× B on a 15-question quiz).
- Target **roughly equal use of A, B, C, and D** — shuffle option text, not just the key.
- Document distribution in the answer file, e.g. `"answerDistribution": { "A": 4, "B": 3, "C": 4, "D": 4 }`.
- Night 7 (2026-06-20): original draft had 12/15 = B; reshuffled after review.

## Exam relevance (required)

- **Do not** ask lab-only trivia that will not appear on the SAA exam — even if the fact appears in a setup script or result file.
- **Avoid:** memorizing constants (e.g. CloudFront alias hosted zone ID `Z2FDTNDATAQYW2`), teardown script “what remains” checklists, resource names from `night-*-lab-*.ps1`, or “what does this repo’s script delete?”
- **Prefer:** routing-policy decision trees, health-check requirements, alias vs CNAME at apex, latency vs geolocation vs failover keywords, ALB multi-AZ vs Route 53 DR, private vs public hosted zone, Global Accelerator vs latency routing.
- Lab nights may include **one** optional “lab awareness” question at most; do not stack multiple non-exam items in the same quiz.
- Night 25 (2026-07-01): Q8 (CloudFront zone ID constant) and Q11 (teardown script scope) flagged as off-target — replace when that quiz is next edited.

## Format

- Scenario-style questions; four plausible distractors.
- `"format"` field in quiz JSON: scenario → best service → why not the others.
- Explanations in answers JSON should cite which night/topic the question reinforces.

## Quiz taker (web UI)

- Quizzes render at `/aws-solutions-architect-study/quiz/` — auto-discovers `night-N-quiz.json` + `night-N-quiz-answers.json` at build time.
- **Gauntlet** at `/aws-solutions-architect-study/quiz/gauntlet/` — one correct answer clears a night; wrong stays on that night with explanation + a new question until every quiz is cleared. Progress is localStorage `saa-quiz-gauntlet-v1`.
- Add a new night: drop both JSON files in `study-lab/` and redeploy; no code changes required.

## Existing quizzes to rebalance (backlog)

- None — nights 1–34 rebalanced 2026-07-10 (option length + A/B/C/D distribution).
