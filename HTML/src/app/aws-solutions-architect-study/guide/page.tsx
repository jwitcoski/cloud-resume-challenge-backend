import Link from "next/link";
import { listGuideSummaries } from "@/data/study-guides";
import { listQuizSummaries } from "@/data/study-quizzes";

export const metadata = {
  title: "SAA-C03 Study Guides | Jonathan Witcoski",
  description:
    "Nightly study lab guides from HTML/study-lab — plain-English notes, labs, and flashcards before each quiz.",
};

export default function StudyGuideIndexPage() {
  const guides = listGuideSummaries();
  const quizNights = new Set(listQuizSummaries().map((q) => q.night));

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
          <h1 className="text-3xl font-bold text-[#444] mb-3">Nightly study guides</h1>
          <p className="leading-relaxed text-[#555] mb-8">
            Read the guide first, then take the quiz. Guides are rendered from{" "}
            <code className="bg-[#f4f4f4] px-1 rounded text-xs">
              HTML/study-lab/night-*-*.md
            </code>{" "}
            at build time — same repo folder as the lab scripts and quiz JSON.
          </p>

          {guides.length === 0 ? (
            <p className="text-[#666]">
              No study guides found. Add a markdown file like{" "}
              <code className="bg-[#f4f4f4] px-1 rounded text-xs">
                night-21-hybrid-networking.md
              </code>{" "}
              under <code className="bg-[#f4f4f4] px-1 rounded text-xs">study-lab/</code>, then
              rebuild the site.
            </p>
          ) : (
            <ul className="space-y-3">
              {guides.map((g) => (
                <li key={g.night}>
                  <div className="rounded-lg border border-[#ddd] p-4 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={`/aws-solutions-architect-study/guide/${g.night}/`}
                        className="font-semibold text-[#444] hover:text-[#007bff]"
                      >
                        Night {g.night}: {g.title}
                      </Link>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Link
                          href={`/aws-solutions-architect-study/guide/${g.night}/`}
                          className="text-[#007bff] hover:underline whitespace-nowrap"
                        >
                          Read guide →
                        </Link>
                        {quizNights.has(g.night) && (
                          <Link
                            href={`/aws-solutions-architect-study/quiz/${g.night}/`}
                            className="text-[#666] hover:text-[#007bff] hover:underline whitespace-nowrap"
                          >
                            · Quiz →
                          </Link>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[#888] mt-1 font-mono">{g.filename}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
