"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { weekForNight } from "@/data/study-night-weeks";
import type { LoadedQuiz, QuizOption, StudyQuizQuestion } from "@/data/study-quizzes-types";

const OPTIONS: QuizOption[] = ["A", "B", "C", "D"];
const STORAGE_KEY = "saa-quiz-gauntlet-v2";
const EXAM_PACE_SECONDS = 96;

type Feedback = "idle" | "correct" | "wrong";
type OrderMode = "sequential" | "random";

type Persisted = {
  clearedNights: number[];
  currentNight: number | null;
  seenByNight: Record<string, string[]>;
  attempts: number;
  wrongs: number;
  orderMode?: OrderMode;
  weekFilter?: number[];
  wrongsByNight?: Record<string, number>;
  streak?: number;
  bestStreak?: number;
  examPace?: boolean;
  elapsedSeconds?: number;
};

type GauntletTakerProps = {
  quizzes: LoadedQuiz[];
  guideNights?: number[];
};

function pickQuestion(
  quiz: LoadedQuiz,
  seenIds: string[]
): StudyQuizQuestion {
  const unseen = quiz.questions.filter((q) => !seenIds.includes(q.id));
  const pool = unseen.length > 0 ? unseen : quiz.questions;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickNextNight(
  activeNights: number[],
  clearedSet: Set<number>,
  mode: OrderMode,
  fromNight?: number | null
): number | null {
  const remaining = activeNights.filter((n) => !clearedSet.has(n));
  if (remaining.length === 0) return null;
  if (mode === "random") {
    return remaining[Math.floor(Math.random() * remaining.length)];
  }
  const startIdx =
    fromNight != null ? Math.max(0, activeNights.indexOf(fromNight)) : 0;
  for (let i = startIdx; i < activeNights.length; i++) {
    if (!clearedSet.has(activeNights[i])) return activeNights[i];
  }
  return remaining[0] ?? null;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function GauntletTaker({
  quizzes,
  guideNights = [],
}: GauntletTakerProps) {
  const guideSet = useMemo(() => new Set(guideNights), [guideNights]);

  const quizByNight = useMemo(() => {
    const map = new Map<number, LoadedQuiz>();
    for (const q of quizzes) map.set(q.night, q);
    return map;
  }, [quizzes]);

  const allNights = useMemo(
    () => quizzes.map((q) => q.night).sort((a, b) => a - b),
    [quizzes]
  );

  const allWeeks = useMemo(() => {
    const set = new Set(allNights.map((n) => weekForNight(n)));
    return [...set].sort((a, b) => a - b);
  }, [allNights]);

  const [mounted, setMounted] = useState(false);
  const [cleared, setCleared] = useState<Set<number>>(new Set());
  const [currentNight, setCurrentNight] = useState<number | null>(null);
  const [question, setQuestion] = useState<StudyQuizQuestion | null>(null);
  const [seenByNight, setSeenByNight] = useState<Record<number, string[]>>({});
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [picked, setPicked] = useState<QuizOption | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [orderMode, setOrderMode] = useState<OrderMode>("sequential");
  const [weekFilter, setWeekFilter] = useState<number[]>([]);
  const [wrongsByNight, setWrongsByNight] = useState<Record<number, number>>(
    {}
  );
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [examPace, setExamPace] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [weakPick, setWeakPick] = useState("");
  const questionStartedAt = useRef<number>(Date.now());

  const activeNights = useMemo(() => {
    if (weekFilter.length === 0) return allNights;
    const weeks = new Set(weekFilter);
    return allNights.filter((n) => weeks.has(weekForNight(n)));
  }, [allNights, weekFilter]);

  const answerMap = useMemo(() => {
    const map = new Map<string, { answer: QuizOption; explanation: string }>();
    for (const quiz of quizzes) {
      for (const a of quiz.answers) {
        map.set(`${quiz.night}:${a.id}`, a);
      }
    }
    return map;
  }, [quizzes]);

  const weeks = useMemo(() => {
    const byWeek = new Map<number, number[]>();
    for (const night of activeNights) {
      const w = weekForNight(night);
      const list = byWeek.get(w) ?? [];
      list.push(night);
      byWeek.set(w, list);
    }
    return [...byWeek.entries()].sort((a, b) => a[0] - b[0]);
  }, [activeNights]);

  const clearedInScope = useMemo(
    () => activeNights.filter((n) => cleared.has(n)).length,
    [activeNights, cleared]
  );

  const weakNights = useMemo(() => {
    return Object.entries(wrongsByNight)
      .map(([night, count]) => ({
        night: Number(night),
        count,
        title: quizByNight.get(Number(night))?.title ?? `Night ${night}`,
      }))
      .filter((w) => w.count > 0 && quizByNight.has(w.night))
      .sort((a, b) => b.count - a.count || a.night - b.night);
  }, [wrongsByNight, quizByNight]);

  const nextUncleared = useCallback(
    (clearedSet: Set<number>, mode: OrderMode, nights: number[], fromNight?: number | null) =>
      pickNextNight(nights, clearedSet, mode, fromNight),
    []
  );

  const loadQuestionForNight = useCallback(
    (night: number, seen: Record<number, string[]>) => {
      const quiz = quizByNight.get(night);
      if (!quiz) return null;
      return pickQuestion(quiz, seen[night] ?? []);
    },
    [quizByNight]
  );

  const persist = useCallback(
    (state: {
      clearedNights: number[];
      currentNight: number | null;
      seenByNight: Record<number, string[]>;
      attempts: number;
      wrongs: number;
      orderMode: OrderMode;
      weekFilter: number[];
      wrongsByNight: Record<number, number>;
      streak: number;
      bestStreak: number;
      examPace: boolean;
      elapsedSeconds: number;
    }) => {
      const payload: Persisted = {
        clearedNights: state.clearedNights,
        currentNight: state.currentNight,
        seenByNight: Object.fromEntries(
          Object.entries(state.seenByNight).map(([k, v]) => [String(k), v])
        ),
        attempts: state.attempts,
        wrongs: state.wrongs,
        orderMode: state.orderMode,
        weekFilter: state.weekFilter,
        wrongsByNight: Object.fromEntries(
          Object.entries(state.wrongsByNight).map(([k, v]) => [String(k), v])
        ),
        streak: state.streak,
        bestStreak: state.bestStreak,
        examPace: state.examPace,
        elapsedSeconds: state.elapsedSeconds,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    []
  );

  const snapshot = useCallback(
    (overrides: Partial<{
      clearedNights: number[];
      currentNight: number | null;
      seenByNight: Record<number, string[]>;
      attempts: number;
      wrongs: number;
      orderMode: OrderMode;
      weekFilter: number[];
      wrongsByNight: Record<number, number>;
      streak: number;
      bestStreak: number;
      examPace: boolean;
      elapsedSeconds: number;
    }> = {}) => ({
      clearedNights: overrides.clearedNights ?? [...cleared],
      currentNight:
        overrides.currentNight !== undefined
          ? overrides.currentNight
          : currentNight,
      seenByNight: overrides.seenByNight ?? seenByNight,
      attempts: overrides.attempts ?? attempts,
      wrongs: overrides.wrongs ?? wrongs,
      orderMode: overrides.orderMode ?? orderMode,
      weekFilter: overrides.weekFilter ?? weekFilter,
      wrongsByNight: overrides.wrongsByNight ?? wrongsByNight,
      streak: overrides.streak ?? streak,
      bestStreak: overrides.bestStreak ?? bestStreak,
      examPace: overrides.examPace ?? examPace,
      elapsedSeconds: overrides.elapsedSeconds ?? elapsed,
    }),
    [
      attempts,
      bestStreak,
      cleared,
      currentNight,
      elapsed,
      examPace,
      orderMode,
      seenByNight,
      streak,
      weekFilter,
      wrongs,
      wrongsByNight,
    ]
  );

  useEffect(() => {
    setMounted(true);
    let clearedSet = new Set<number>();
    let seen: Record<number, string[]> = {};
    let night: number | null = null;
    let nextAttempts = 0;
    let nextWrongs = 0;
    let mode: OrderMode = "sequential";
    let weeksSel: number[] = [];
    let wrongMap: Record<number, number> = {};
    let nextStreak = 0;
    let nextBest = 0;
    let pace = false;
    let nextElapsed = 0;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        clearedSet = new Set(
          (parsed.clearedNights ?? []).filter((n) => quizByNight.has(n))
        );
        seen = {};
        for (const [k, ids] of Object.entries(parsed.seenByNight ?? {})) {
          seen[Number(k)] = ids;
        }
        nextAttempts = parsed.attempts ?? 0;
        nextWrongs = parsed.wrongs ?? 0;
        if (parsed.orderMode === "random" || parsed.orderMode === "sequential") {
          mode = parsed.orderMode;
        }
        weeksSel = (parsed.weekFilter ?? []).filter((w) => allWeeks.includes(w));
        for (const [k, v] of Object.entries(parsed.wrongsByNight ?? {})) {
          wrongMap[Number(k)] = v;
        }
        nextStreak = parsed.streak ?? 0;
        nextBest = parsed.bestStreak ?? 0;
        pace = Boolean(parsed.examPace);
        nextElapsed = parsed.elapsedSeconds ?? 0;
        if (
          parsed.currentNight != null &&
          quizByNight.has(parsed.currentNight) &&
          !clearedSet.has(parsed.currentNight)
        ) {
          night = parsed.currentNight;
        }
      }
    } catch {
      /* ignore */
    }

    const nights =
      weeksSel.length === 0
        ? allNights
        : allNights.filter((n) => weeksSel.includes(weekForNight(n)));

    if (night != null && !nights.includes(night)) night = null;
    if (night == null) night = nextUncleared(clearedSet, mode, nights);

    setOrderMode(mode);
    setWeekFilter(weeksSel);
    setCleared(clearedSet);
    setSeenByNight(seen);
    setAttempts(nextAttempts);
    setWrongs(nextWrongs);
    setWrongsByNight(wrongMap);
    setStreak(nextStreak);
    setBestStreak(nextBest);
    setExamPace(pace);
    setElapsed(nextElapsed);
    setCurrentNight(night);
    questionStartedAt.current = Date.now();
    setQuestionElapsed(0);
    if (night != null) {
      setQuestion(loadQuestionForNight(night, seen));
    } else {
      setQuestion(null);
    }
  }, [allNights, allWeeks, loadQuestionForNight, nextUncleared, quizByNight]);

  const currentQuiz = currentNight != null ? quizByNight.get(currentNight) : null;
  const key =
    currentNight != null && question
      ? answerMap.get(`${currentNight}:${question.id}`)
      : undefined;
  const complete =
    mounted && activeNights.length > 0 && clearedInScope === activeNights.length;

  const accuracy =
    attempts > 0 ? Math.round(((attempts - wrongs) / attempts) * 100) : null;
  const avgSeconds =
    attempts > 0 && elapsed > 0 ? Math.round(elapsed / attempts) : null;
  const overPace = examPace && feedback === "idle" && questionElapsed > EXAM_PACE_SECONDS;

  useEffect(() => {
    if (!mounted || complete) return;
    const id = window.setInterval(() => {
      setElapsed((t) => {
        const next = t + 1;
        setQuestionElapsed(
          Math.floor((Date.now() - questionStartedAt.current) / 1000)
        );
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mounted, complete]);

  // Persist elapsed occasionally without resetting the interval every tick
  const persistRef = useRef(persist);
  const snapshotRef = useRef(snapshot);
  persistRef.current = persist;
  snapshotRef.current = snapshot;
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;

  useEffect(() => {
    if (!mounted || complete) return;
    const id = window.setInterval(() => {
      persistRef.current(
        snapshotRef.current({ elapsedSeconds: elapsedRef.current })
      );
    }, 15000);
    return () => window.clearInterval(id);
  }, [mounted, complete]);

  const startQuestionClock = () => {
    questionStartedAt.current = Date.now();
    setQuestionElapsed(0);
  };

  const advanceAfterCorrect = useCallback(
    (nightJustCleared: number, nextCleared: Set<number>) => {
      const nextNight = nextUncleared(
        nextCleared,
        orderMode,
        activeNights,
        nightJustCleared
      );
      setFeedback("idle");
      setPicked(null);
      setCurrentNight(nextNight);
      startQuestionClock();
      if (nextNight == null) {
        setQuestion(null);
        persist(
          snapshot({
            clearedNights: [...nextCleared],
            currentNight: null,
          })
        );
        return;
      }
      const q = loadQuestionForNight(nextNight, seenByNight);
      setQuestion(q);
      persist(
        snapshot({
          clearedNights: [...nextCleared],
          currentNight: nextNight,
        })
      );
    },
    [
      activeNights,
      loadQuestionForNight,
      nextUncleared,
      orderMode,
      persist,
      seenByNight,
      snapshot,
    ]
  );

  useEffect(() => {
    if (feedback !== "correct" || currentNight == null) return;
    const night = currentNight;
    const nextCleared = new Set(cleared);
    const id = window.setTimeout(() => {
      advanceAfterCorrect(night, nextCleared);
    }, 1100);
    return () => window.clearTimeout(id);
  }, [feedback, currentNight, cleared, advanceAfterCorrect]);

  const choose = (letter: QuizOption) => {
    if (feedback !== "idle" || !question || currentNight == null || !key) return;

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setPicked(letter);

    const seen = {
      ...seenByNight,
      [currentNight]: [...(seenByNight[currentNight] ?? []), question.id].filter(
        (id, i, arr) => arr.indexOf(id) === i
      ),
    };
    setSeenByNight(seen);

    if (letter === key.answer) {
      const nextCleared = new Set(cleared);
      nextCleared.add(currentNight);
      const nextStreak = streak + 1;
      const nextBest = Math.max(bestStreak, nextStreak);
      setCleared(nextCleared);
      setStreak(nextStreak);
      setBestStreak(nextBest);
      setFeedback("correct");
      persist(
        snapshot({
          clearedNights: [...nextCleared],
          currentNight,
          seenByNight: seen,
          attempts: nextAttempts,
          streak: nextStreak,
          bestStreak: nextBest,
        })
      );
    } else {
      const nextWrongs = wrongs + 1;
      const nextWrongMap = {
        ...wrongsByNight,
        [currentNight]: (wrongsByNight[currentNight] ?? 0) + 1,
      };
      setWrongs(nextWrongs);
      setWrongsByNight(nextWrongMap);
      setStreak(0);
      setFeedback("wrong");
      persist(
        snapshot({
          currentNight,
          seenByNight: seen,
          attempts: nextAttempts,
          wrongs: nextWrongs,
          wrongsByNight: nextWrongMap,
          streak: 0,
        })
      );
    }
  };

  const continueAfterWrong = () => {
    if (currentNight == null) return;
    setFeedback("idle");
    setPicked(null);
    startQuestionClock();
    const q = loadQuestionForNight(currentNight, seenByNight);
    setQuestion(q);
    persist(snapshot());
  };

  const changeOrderMode = (mode: OrderMode) => {
    if (mode === orderMode) return;
    setOrderMode(mode);
    persist(snapshot({ orderMode: mode }));
  };

  const toggleWeek = (week: number) => {
    const next = weekFilter.includes(week)
      ? weekFilter.filter((w) => w !== week)
      : [...weekFilter, week].sort((a, b) => a - b);
    applyWeekFilter(next);
  };

  const clearWeekFilter = () => applyWeekFilter([]);

  const applyWeekFilter = (nextWeeks: number[]) => {
    setWeekFilter(nextWeeks);
    const nights =
      nextWeeks.length === 0
        ? allNights
        : allNights.filter((n) => nextWeeks.includes(weekForNight(n)));

    let night = currentNight;
    if (night == null || !nights.includes(night) || cleared.has(night)) {
      night = nextUncleared(cleared, orderMode, nights, currentNight);
    }

    setFeedback("idle");
    setPicked(null);
    setCurrentNight(night);
    startQuestionClock();
    setQuestion(night != null ? loadQuestionForNight(night, seenByNight) : null);
    persist(
      snapshot({
        weekFilter: nextWeeks,
        currentNight: night,
      })
    );
  };

  const toggleExamPace = () => {
    const next = !examPace;
    setExamPace(next);
    startQuestionClock();
    persist(snapshot({ examPace: next }));
  };

  const reset = () => {
    const night = nextUncleared(new Set(), orderMode, activeNights);
    setCleared(new Set());
    setSeenByNight({});
    setAttempts(0);
    setWrongs(0);
    setWrongsByNight({});
    setStreak(0);
    setBestStreak(0);
    setElapsed(0);
    setWeakPick("");
    setFeedback("idle");
    setPicked(null);
    setCurrentNight(night);
    startQuestionClock();
    setQuestion(night != null ? loadQuestionForNight(night, {}) : null);
    persist(
      snapshot({
        clearedNights: [],
        currentNight: night,
        seenByNight: {},
        attempts: 0,
        wrongs: 0,
        wrongsByNight: {},
        streak: 0,
        bestStreak: 0,
        elapsedSeconds: 0,
      })
    );
  };

  const selectedWeak = weakPick ? Number(weakPick) : null;
  const selectedWeakMeta = weakNights.find((w) => w.night === selectedWeak);

  if (!mounted) {
    return <p className="text-sm text-[#666] py-8 text-center">Loading gauntlet…</p>;
  }

  if (allNights.length === 0) {
    return (
      <p className="text-[#666]">
        No quizzes found. Add night quiz JSON under study-lab/, then rebuild.
      </p>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 sm:-mx-8 px-6 sm:px-8 py-3 mb-6 bg-white/95 backdrop-blur border-b border-[#eee]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#888]">
              Cross-night gauntlet
            </p>
            <h1 className="text-xl font-bold text-[#444]">Clear every quiz</h1>
            <p className="text-sm text-[#666] mt-0.5">
              One correct answer clears a night. Miss → stay on that night with a new
              question.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div
              className="inline-flex rounded border border-[#ddd] overflow-hidden"
              role="group"
              aria-label="Night order"
            >
              <button
                type="button"
                onClick={() => changeOrderMode("sequential")}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  orderMode === "sequential"
                    ? "bg-[#444] text-white"
                    : "bg-[#fafafa] text-[#555] hover:bg-[#f0f0f0]"
                }`}
              >
                In order
              </button>
              <button
                type="button"
                onClick={() => changeOrderMode("random")}
                className={`px-2.5 py-1 text-xs font-medium border-l border-[#ddd] transition-colors ${
                  orderMode === "random"
                    ? "bg-[#444] text-white"
                    : "bg-[#fafafa] text-[#555] hover:bg-[#f0f0f0]"
                }`}
              >
                Random
              </button>
            </div>
            <button
              type="button"
              onClick={toggleExamPace}
              className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                examPace
                  ? "border-amber-400 bg-amber-50 text-amber-900"
                  : "border-[#ddd] bg-[#fafafa] text-[#555] hover:bg-[#f0f0f0]"
              }`}
              title={`~${EXAM_PACE_SECONDS}s per question`}
            >
              Exam pace
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-xs uppercase tracking-wider text-[#888] mr-1">
            Weeks
          </span>
          <button
            type="button"
            onClick={clearWeekFilter}
            className={`rounded px-2 py-1 text-xs font-medium border transition-colors ${
              weekFilter.length === 0
                ? "bg-[#444] text-white border-[#444]"
                : "bg-[#fafafa] text-[#555] border-[#ddd] hover:bg-[#f0f0f0]"
            }`}
          >
            All
          </button>
          {allWeeks.map((week) => {
            const on = weekFilter.includes(week);
            return (
              <button
                key={week}
                type="button"
                onClick={() => toggleWeek(week)}
                className={`rounded px-2 py-1 text-xs font-medium border transition-colors ${
                  on
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-[#fafafa] text-[#555] border-[#ddd] hover:bg-[#f0f0f0]"
                }`}
              >
                W{week}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded border border-[#ddd] bg-[#fafafa] px-2.5 py-1 text-[#555]">
            {clearedInScope}/{activeNights.length} nights
          </span>
          <span className="rounded border border-[#ddd] bg-[#fafafa] px-2.5 py-1 text-[#555]">
            {accuracy != null ? `${accuracy}%` : "—"} accuracy
          </span>
          <span className="rounded border border-[#ddd] bg-[#fafafa] px-2.5 py-1 text-[#555]">
            streak {streak}
            {bestStreak > 0 ? ` · best ${bestStreak}` : ""}
          </span>
          <span className="rounded border border-[#ddd] bg-[#fafafa] px-2.5 py-1 text-[#555] font-mono tabular-nums">
            {formatTime(elapsed)}
            {avgSeconds != null ? ` · ~${avgSeconds}s/q` : ""}
          </span>
          {examPace && !complete && (
            <span
              className={`rounded border px-2.5 py-1 font-mono tabular-nums ${
                overPace
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-[#ddd] bg-[#fafafa] text-[#555]"
              }`}
            >
              Q {formatTime(questionElapsed)} / {EXAM_PACE_SECONDS}s
            </span>
          )}
        </div>

        <div className="mt-3 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
            style={{
              width: `${(clearedInScope / Math.max(activeNights.length, 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {weakNights.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <label
            htmlFor="weak-night-select"
            className="block text-sm font-semibold text-[#444] mb-1"
          >
            Weak nights
          </label>
          <p className="text-xs text-[#666] mb-3">
            Nights with the most misses this run — pick one to open that day&apos;s
            study notes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              id="weak-night-select"
              value={weakPick}
              onChange={(e) => setWeakPick(e.target.value)}
              className="w-full sm:max-w-md rounded-md border border-[#ccc] bg-white px-3 py-2 text-sm text-[#444]"
            >
              <option value="">Select a weak night…</option>
              {weakNights.map((w) => (
                <option key={w.night} value={String(w.night)}>
                  Night {w.night}: {w.title} ({w.count} wrong)
                </option>
              ))}
            </select>
            {selectedWeak != null && selectedWeakMeta && (
              <div className="flex flex-wrap gap-2 items-center text-sm">
                {guideSet.has(selectedWeak) ? (
                  <Link
                    href={`/aws-solutions-architect-study/guide/${selectedWeak}/`}
                    className="inline-flex items-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read Night {selectedWeak} notes →
                  </Link>
                ) : (
                  <span className="text-[#888]">No study guide for this night yet.</span>
                )}
                <Link
                  href={`/aws-solutions-architect-study/quiz/${selectedWeak}/`}
                  className="text-teal-800 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Full quiz
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-8 space-y-3">
        {weeks.map(([week, nights]) => {
          const clearedInWeek = nights.filter((n) => cleared.has(n)).length;
          const weekDone = clearedInWeek === nights.length;
          return (
            <div key={week}>
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#888]">
                  Week {week}
                  {weekDone ? " · cleared" : ""}
                </p>
                <p className="text-xs text-[#888]">
                  {clearedInWeek}/{nights.length}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {nights.map((night) => {
                  const isCleared = cleared.has(night);
                  const isCurrent = night === currentNight && !complete;
                  const missCount = wrongsByNight[night] ?? 0;
                  return (
                    <span
                      key={night}
                      title={
                        missCount > 0
                          ? `Night ${night} · ${missCount} wrong`
                          : `Night ${night}`
                      }
                      className={`inline-flex min-w-[2.25rem] items-center justify-center rounded px-1.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                        isCleared
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : isCurrent
                            ? "bg-blue-100 text-blue-900 border border-blue-400 ring-1 ring-blue-400"
                            : missCount > 0
                              ? "bg-amber-50 text-amber-900 border border-amber-300"
                              : "bg-[#f4f4f4] text-[#777] border border-[#e0e0e0]"
                      }`}
                    >
                      {night}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {complete ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center">
          <p className="text-2xl font-bold text-emerald-900 mb-2">Gauntlet complete</p>
          <p className="text-sm text-emerald-800 leading-relaxed mb-2">
            Cleared {activeNights.length} night
            {activeNights.length === 1 ? "" : "s"}
            {weekFilter.length > 0
              ? ` (week${weekFilter.length > 1 ? "s" : ""} ${weekFilter.join(", ")})`
              : ""}{" "}
            in {attempts} attempts
            {wrongs > 0 ? ` (${wrongs} wrong)` : ""}.
          </p>
          <p className="text-sm text-emerald-800 mb-4">
            {accuracy != null ? `${accuracy}% accuracy` : ""}
            {bestStreak > 0 ? ` · best streak ${bestStreak}` : ""}
            {` · ${formatTime(elapsed)}`}
            {avgSeconds != null ? ` · ~${avgSeconds}s/q` : ""}
          </p>
          {weakNights.length > 0 && (
            <p className="text-sm text-amber-900 mb-4">
              Review weak nights above, then run again.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={reset}>
              Run gauntlet again
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/aws-solutions-architect-study/quiz/">All quizzes</Link>
            </Button>
          </div>
        </div>
      ) : currentQuiz && question && key ? (
        <div
          className={`rounded-lg border p-4 sm:p-5 transition-colors duration-300 ${
            feedback === "correct"
              ? "border-emerald-400 bg-emerald-50"
              : feedback === "wrong"
                ? "border-red-300 bg-red-50/60"
                : "border-[#ddd] bg-white"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <p className="text-xs uppercase tracking-widest text-[#888]">
              Week {weekForNight(currentQuiz.night)} · Night {currentQuiz.night}
            </p>
            <p className="text-xs text-[#888]">{question.id}</p>
          </div>
          <h2 className="text-lg font-semibold text-[#444] mb-1">{currentQuiz.title}</h2>
          {currentQuiz.topic && (
            <p className="text-sm text-[#666] mb-4">{currentQuiz.topic}</p>
          )}
          <p className="font-medium text-[#444] mb-4 leading-relaxed">{question.question}</p>

          <div className="space-y-2">
            {OPTIONS.map((letter) => {
              const selected = picked === letter;
              const isAnswer = key.answer === letter;
              const showCorrect = feedback !== "idle" && isAnswer;
              const showWrongPick =
                feedback === "wrong" && selected && !isAnswer;

              let optionClass =
                "w-full text-left rounded-md border px-3 py-2.5 text-sm leading-snug transition-colors ";
              if (feedback === "idle") {
                optionClass += selected
                  ? "border-blue-500 bg-blue-50 text-[#333] ring-1 ring-blue-500"
                  : "border-[#ddd] bg-white text-[#444] hover:border-blue-300 hover:bg-blue-50/40";
              } else if (showCorrect) {
                optionClass +=
                  "border-emerald-400 bg-emerald-100 text-emerald-900 font-medium";
              } else if (showWrongPick) {
                optionClass +=
                  "border-red-300 bg-red-100 text-red-900 line-through";
              } else {
                optionClass += "border-[#e5e5e5] bg-[#fafafa] text-[#666]";
              }

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={feedback !== "idle"}
                  onClick={() => choose(letter)}
                  className={optionClass}
                >
                  <span className="font-semibold mr-2">{letter}.</span>
                  {question.options[letter]}
                </button>
              );
            })}
          </div>

          {feedback === "correct" && (
            <p className="mt-4 text-sm text-emerald-900 font-medium leading-relaxed border-t border-emerald-200 pt-3">
              Correct — Night {currentQuiz.night} cleared.{" "}
              {orderMode === "random"
                ? "Picking another uncleared night…"
                : "Moving on…"}
            </p>
          )}

          {feedback === "wrong" && (
            <div className="mt-4 border-t border-red-200 pt-3 space-y-3">
              <p className="text-sm text-[#555] leading-relaxed">
                <strong className="text-[#444]">Answer: {key.answer}.</strong>{" "}
                {key.explanation}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={continueAfterWrong}>
                  Try another from Night {currentQuiz.night}
                </Button>
                {guideSet.has(currentQuiz.night) && (
                  <Button type="button" variant="outline" asChild>
                    <Link
                      href={`/aws-solutions-architect-study/guide/${currentQuiz.night}/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read notes
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : activeNights.length === 0 ? (
        <p className="text-sm text-[#666]">No nights in the selected week filter.</p>
      ) : (
        <p className="text-sm text-[#666]">Could not load the next question.</p>
      )}

      {!complete && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            Reset gauntlet
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/aws-solutions-architect-study/quiz/">All quizzes</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
