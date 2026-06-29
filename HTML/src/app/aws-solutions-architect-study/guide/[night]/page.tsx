import Link from "next/link";
import { notFound } from "next/navigation";
import StudyGuideMarkdown from "@/components/StudyGuideMarkdown";
import { listGuideNights, loadGuide } from "@/data/study-guides";
import { listQuizNights } from "@/data/study-quizzes";

type PageProps = {
  params: Promise<{ night: string }>;
};

export function generateStaticParams() {
  return listGuideNights().map((night) => ({
    night: String(night),
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { night: nightParam } = await params;
  const night = Number.parseInt(nightParam, 10);
  const guide = loadGuide(night);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `Night ${guide.night} — ${guide.title} | SAA-C03 Study`,
    description: `Study guide for night ${guide.night}: ${guide.title}`,
  };
}

export default async function StudyGuideNightPage({ params }: PageProps) {
  const { night: nightParam } = await params;
  const night = Number.parseInt(nightParam, 10);
  if (Number.isNaN(night)) notFound();

  const guide = loadGuide(night);
  if (!guide) notFound();

  const quizAvailable = listQuizNights().includes(night);

  return (
    <main className="min-h-screen bg-[#f4f4f4] text-[#333]">
      <div className="container max-w-3xl mx-auto px-4 sm:px-7 py-10">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm">
            <Link
              href="/aws-solutions-architect-study/guide/"
              className="text-[#007bff] hover:underline"
            >
              ← All guides
            </Link>
            <Link
              href="/aws-solutions-architect-study/"
              className="text-[#666] hover:text-[#007bff] hover:underline"
            >
              Study plan
            </Link>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-[#555]">
              {quizAvailable
                ? `Done reading? Take the timed quiz for Night ${guide.night}.`
                : `No quiz JSON yet for Night ${guide.night} — guide only.`}
            </p>
            {quizAvailable && (
              <Link
                href={`/aws-solutions-architect-study/quiz/${guide.night}/`}
                className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#007bff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0069d9] transition-colors"
              >
                Open quiz →
              </Link>
            )}
          </div>

          <StudyGuideMarkdown content={guide.content} />

          <div className="mt-10 pt-6 border-t border-[#eee] flex flex-wrap gap-4 text-sm">
            {quizAvailable && (
              <Link
                href={`/aws-solutions-architect-study/quiz/${guide.night}/`}
                className="text-[#007bff] hover:underline"
              >
                Night {guide.night} quiz →
              </Link>
            )}
            <Link
              href="/aws-solutions-architect-study/guide/"
              className="text-[#666] hover:text-[#007bff] hover:underline"
            >
              All study guides
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
