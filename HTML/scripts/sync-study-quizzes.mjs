/**
 * Copy study-lab quiz JSON into public/study-lab so quizzes load in the
 * browser without a server rebuild. Also writes quiz-manifest.json for the index.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlRoot = path.join(__dirname, "..");
const studyLab = path.join(htmlRoot, "study-lab");
const publicDir = path.join(htmlRoot, "public", "study-lab");

if (!fs.existsSync(studyLab)) {
  console.warn("sync-study-quizzes: study-lab not found, skipping");
  process.exit(0);
}

fs.mkdirSync(publicDir, { recursive: true });

const nights = [];
for (const file of fs.readdirSync(studyLab)) {
  const match = file.match(/^night-(\d+)-quiz\.json$/);
  if (!match) continue;
  const night = Number.parseInt(match[1], 10);
  const answers = `night-${night}-quiz-answers.json`;
  if (!fs.existsSync(path.join(studyLab, answers))) continue;

  fs.copyFileSync(path.join(studyLab, file), path.join(publicDir, file));
  fs.copyFileSync(path.join(studyLab, answers), path.join(publicDir, answers));

  const quiz = JSON.parse(fs.readFileSync(path.join(studyLab, file), "utf-8"));
  nights.push({
    night: quiz.night,
    title: quiz.title,
    topic: quiz.topic,
    questionCount: quiz.questions?.length ?? 0,
    suggestedMinutes: Math.max(
      1,
      Math.round(((quiz.questions?.length ?? 0) * 96) / 60)
    ),
  });
}

nights.sort((a, b) => a.night - b.night);
fs.writeFileSync(
  path.join(publicDir, "quiz-manifest.json"),
  JSON.stringify({ nights }, null, 2)
);

console.log(
  `sync-study-quizzes: ${nights.length} quiz(es) → public/study-lab/ (nights ${nights.map((n) => n.night).join(", ")})`
);
