import fs from "fs";
import path from "path";

export type GuideSummary = {
  night: number;
  title: string;
  filename: string;
};

export type LoadedGuide = GuideSummary & {
  content: string;
};

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

function parseTitle(markdown: string, night: number): string {
  const match = markdown.match(/^#\s+Night\s+\d+\s+[—–-]\s+(.+)$/m);
  if (match) return match[1].trim();
  return `Night ${night} study guide`;
}

function guideFiles(): { night: number; filename: string; filepath: string }[] {
  const dir = studyLabDir();
  if (!fs.existsSync(dir)) return [];

  const guides: { night: number; filename: string; filepath: string }[] = [];
  for (const file of fs.readdirSync(dir)) {
    const match = file.match(/^night-(\d+)-.+\.md$/);
    if (!match) continue;
    guides.push({
      night: Number.parseInt(match[1], 10),
      filename: file,
      filepath: path.join(dir, file),
    });
  }
  return guides.sort((a, b) => a.night - b.night);
}

export function listGuideNights(): number[] {
  return guideFiles().map((g) => g.night);
}

export function listGuideSummaries(): GuideSummary[] {
  return guideFiles().map(({ night, filename, filepath }) => {
    const markdown = fs.readFileSync(filepath, "utf-8");
    return {
      night,
      title: parseTitle(markdown, night),
      filename,
    };
  });
}

export function loadGuide(night: number): LoadedGuide | null {
  const match = guideFiles().find((g) => g.night === night);
  if (!match) return null;

  const content = fs.readFileSync(match.filepath, "utf-8");
  return {
    night,
    title: parseTitle(content, night),
    filename: match.filename,
    content,
  };
}

export function hasGuide(night: number): boolean {
  return guideFiles().some((g) => g.night === night);
}
