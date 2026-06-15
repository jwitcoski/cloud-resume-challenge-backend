"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  countByReadiness,
  domainTasks,
  examServices,
  readinessLegend,
  reviewSchedule,
  type ExamReadiness,
} from "@/data/saa-c03-exam-checklist";

const STORAGE_KEY = "saa-c03-checklist-v1";

type Filter = "all" | ExamReadiness;

function ReadinessBadge({ readiness }: { readiness: ExamReadiness }) {
  const styles: Record<ExamReadiness, string> = {
    know: "bg-green-100 text-green-800 border-green-200",
    partial: "bg-blue-100 text-blue-800 border-blue-200",
    study: "bg-orange-100 text-orange-800 border-orange-200",
    awareness: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border whitespace-nowrap ${styles[readiness]}`}>
      {readinessLegend[readiness].label}
    </span>
  );
}

export default function ExamChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [tasksChecked, setTasksChecked] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          services?: Record<string, boolean>;
          tasks?: Record<string, boolean>;
        };
        setChecked(parsed.services ?? {});
        setTasksChecked(parsed.tasks ?? {});
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = useCallback(
    (services: Record<string, boolean>, tasks: Record<string, boolean>) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ services, tasks })
      );
    },
    []
  );

  const toggleService = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      persist(next, tasksChecked);
      return next;
    });
  };

  const toggleTask = (id: string) => {
    setTasksChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      persist(checked, next);
      return next;
    });
  };

  const counts = useMemo(() => countByReadiness(examServices), []);

  const categories = useMemo(
    () => [...new Set(examServices.map((s) => s.category))].sort(),
    []
  );

  const filteredServices = useMemo(() => {
    return examServices.filter((s) => {
      if (filter !== "all" && s.readiness !== filter) return false;
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      return true;
    });
  }, [filter, categoryFilter]);

  const servicesReviewed = Object.values(checked).filter(Boolean).length;
  const tasksReviewed = Object.values(tasksChecked).filter(Boolean).length;
  const totalCheckpoints = domainTasks.reduce((n, t) => n + t.checkpoints.length, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredServices>();
    for (const s of filteredServices) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredServices]);

  if (!mounted) {
    return (
      <p className="text-sm text-[#666] mb-6">Loading checklist…</p>
    );
  }

  return (
    <div className="space-y-10">
      {/* Progress summary */}
      <div className="rounded-lg border border-[#ddd] p-4 bg-[#fafafa]">
        <h3 className="font-semibold text-[#444] mb-3">Exam coverage progress</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-[#666] mb-1">
              Services reviewed:{" "}
              <strong className="text-[#333]">
                {servicesReviewed} / {counts.total}
              </strong>
            </p>
            <div className="h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${(servicesReviewed / counts.total) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-[#666] mb-1">
              Domain checkpoints:{" "}
              <strong className="text-[#333]">
                {tasksReviewed} / {totalCheckpoints}
              </strong>
            </p>
            <div className="h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${(tasksReviewed / totalCheckpoints) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-green-100 text-green-800">
            Know {counts.know}
          </span>
          <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
            Partial {counts.partial}
          </span>
          <span className="px-2 py-1 rounded bg-orange-100 text-orange-800">
            Study {counts.study}
          </span>
          <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
            Awareness {counts.awareness}
          </span>
        </div>
      </div>

      {/* How to review nightly */}
      <div>
        <h3 className="text-xl font-semibold text-[#444] mb-3">
          How to review everything (built into each 2-hour night)
        </h3>
        <p className="leading-relaxed mb-4 text-[#555]">
          During the <strong>Retain (20–30 min)</strong> block each night, check off services from
          that week&apos;s categories. For each unchecked service, read the exam focus line and
          answer aloud: <em>When would I pick this over the alternatives?</em>
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#ddd] bg-[#fafafa]">
                <th className="text-left p-2 font-semibold">Week</th>
                <th className="text-left p-2 font-semibold">Review these categories</th>
                <th className="text-left p-2 font-semibold hidden sm:table-cell">~Services</th>
              </tr>
            </thead>
            <tbody>
              {reviewSchedule.map((row) => (
                <tr key={row.week} className="border-b border-[#eee]">
                  <td className="p-2 font-medium">Week {row.week}</td>
                  <td className="p-2 text-[#555]">{row.categories.join(" · ")}</td>
                  <td className="p-2 text-[#666] hidden sm:table-cell">{row.serviceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-[#666]">
          Week 5 also includes two full practice exams. Target: every service checked before exam day.
        </p>
      </div>

      {/* Domain tasks */}
      <div>
        <h3 className="text-xl font-semibold text-[#444] mb-3">
          Domain task checklist (official SAA-C03 tasks)
        </h3>
        <div className="space-y-4">
          {domainTasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-[#e5e5e5] p-4 bg-[#fafafa]">
              <p className="text-xs uppercase tracking-wide text-[#888] mb-1">
                Domain {task.domain} — {task.domainLabel} ({task.weight})
              </p>
              <p className="font-medium text-[#333] mb-2">{task.task}</p>
              <ul className="space-y-1.5">
                {task.checkpoints.map((cp, i) => {
                  const cpId = `${task.id}-cp-${i}`;
                  return (
                    <li key={cpId} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        id={cpId}
                        checked={!!tasksChecked[cpId]}
                        onChange={() => toggleTask(cpId)}
                        className="mt-1 shrink-0"
                      />
                      <label htmlFor={cpId} className="text-[#555] cursor-pointer">
                        {cp}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Service checklist */}
      <div>
        <h3 className="text-xl font-semibold text-[#444] mb-3">
          In-scope services checklist ({counts.total} services)
        </h3>
        <p className="text-sm text-[#666] mb-4">
          From the{" "}
          <a
            href="https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#007bff] hover:underline"
          >
            official SAA-C03 exam guide
          </a>
          . Check each row when you can explain its use case and main alternatives.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", "know", "partial", "study", "awareness"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f
                  ? "bg-[#333] text-white border-[#333]"
                  : "bg-white text-[#555] border-[#ddd] hover:border-[#999]"
              }`}
            >
              {f === "all" ? "All" : readinessLegend[f].label}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-[#ddd] rounded px-2 py-1.5 mb-6 bg-white w-full sm:w-auto"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="space-y-6">
          {grouped.map(([category, services]) => (
            <div key={category}>
              <h4 className="font-semibold text-[#444] mb-2 pb-1 border-b border-[#eee]">
                {category}
                <span className="font-normal text-[#888] text-sm ml-2">({services.length})</span>
              </h4>
              <ul className="space-y-2">
                {services.map((s) => (
                  <li
                    key={s.id}
                    className={`rounded border p-3 ${
                      checked[s.id] ? "border-green-200 bg-green-50/50" : "border-[#eee] bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={s.id}
                        checked={!!checked[s.id]}
                        onChange={() => toggleService(s.id)}
                        className="mt-1 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <label htmlFor={s.id} className="font-medium text-[#333] cursor-pointer">
                            {s.name}
                          </label>
                          <ReadinessBadge readiness={s.readiness} />
                          {s.studyWeek && (
                            <span className="text-xs text-[#888]">Week {s.studyWeek}</span>
                          )}
                        </div>
                        <p className="text-sm text-[#555]">{s.examFocus}</p>
                        {s.gsaNote && (
                          <p className="text-xs text-[#007bff] mt-1">GSA: {s.gsaNote}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
