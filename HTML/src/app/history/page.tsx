import Image from "next/image";
import Link from "next/link";
import {
  archaeologyTimeline,
  arcgisDesktopArchive,
  earlyPythonProjects,
  printedMaps,
  thesisAbstract,
  thesisPdfPath,
  thesisTitle,
} from "@/data/history-data";

export const metadata = {
  title: "History & Archive | Jonathan Witcoski",
  description:
    "Archaeology career timeline, master's thesis, printed maps, and early Python GIS work — archived from the legacy portfolio.",
};

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f4] text-[#333]">
      <div className="container max-w-3xl mx-auto px-4 sm:px-7 py-10">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6 sm:p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-8"
          >
            ← Back to resume
          </Link>

          <p className="text-sm tracking-[2px] text-primary uppercase font-medium mb-2">
            Archive
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#444] mb-4">
            History
          </h1>
          <p className="leading-relaxed text-[#555] mb-8">
            Academic and early-career work migrated from the old personal site —
            archaeology field experience, the 2007 master&apos;s thesis, printed
            cartography, and early Python GIS experiments.
          </p>

          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-10 pb-6 border-b border-primary/10">
            <a href="#thesis" className="text-primary hover:underline">
              Thesis
            </a>
            <a href="#archaeology" className="text-primary hover:underline">
              Archaeology
            </a>
            <a href="#maps" className="text-primary hover:underline">
              Printed maps
            </a>
            <a href="#arcgis-desktop" className="text-primary hover:underline">
              ArcGIS Desktop
            </a>
            <a href="#python" className="text-primary hover:underline">
              Early Python GIS
            </a>
          </nav>

          {/* Thesis */}
          <section id="thesis" className="scroll-mt-8 mb-14">
            <p className="text-sm tracking-[2px] text-primary uppercase font-medium mb-2">
              Master&apos;s thesis
            </p>
            <h2 className="text-2xl font-bold text-[#444] mb-2">
              University of Tennessee, 2007
            </h2>
            <p className="font-medium text-[#444] mb-4">{thesisTitle}</p>
            <p className="text-sm tracking-[2px] text-[#888] uppercase mb-3">
              Abstract
            </p>
            <p className="leading-relaxed mb-6 text-[#333]">{thesisAbstract}</p>
            <a
              href={thesisPdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Download PDF →
            </a>
            <div className="mt-6 rounded border border-[#ddd] overflow-hidden bg-[#f8f9fb]">
              <iframe
                title="Master's thesis PDF"
                src={thesisPdfPath}
                className="w-full h-[420px] border-0"
              />
            </div>
          </section>

          {/* Archaeology */}
          <section id="archaeology" className="scroll-mt-8 mb-14">
            <p className="text-sm tracking-[2px] text-primary uppercase font-medium mb-2">
              Archaeology
            </p>
            <h2 className="text-2xl font-bold text-[#444] mb-4">
              Field and lab career
            </h2>
            <figure className="mb-8">
              <Image
                src="/images/history/archeology.jpg"
                alt="Archaeology field work"
                width={800}
                height={400}
                className="w-full h-auto rounded border border-[#ddd]"
              />
            </figure>

            <div className="relative">
              <div className="hidden sm:block absolute left-[7.5rem] top-0 bottom-0 w-px bg-primary/10" />
              {archaeologyTimeline.map((item, index) => (
                <div
                  key={`${item.date}-${item.title}`}
                  className={`relative flex flex-col sm:flex-row sm:items-start gap-4 ${
                    index !== archaeologyTimeline.length - 1
                      ? "mb-8 sm:mb-12"
                      : ""
                  }`}
                >
                  <div className="relative pl-8 sm:pl-0 sm:w-[7.5rem] sm:text-right sm:pr-8 shrink-0">
                    <p className="text-sm font-medium text-[#555]">
                      {item.date}
                    </p>
                    <div className="absolute left-1.5 sm:left-auto sm:-right-1.5 top-0.5 z-10 p-1 border border-primary/10 rounded-full bg-white">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-3 flex-1 sm:pl-8 ml-2 sm:ml-0">
                    <Image
                      src={item.image}
                      alt=""
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover border border-primary/10 shrink-0"
                    />
                    <div>
                      <h3 className="font-semibold text-[#444]">{item.title}</h3>
                      <p className="text-sm text-primary mb-1">
                        {item.subtitle}
                      </p>
                      <p className="text-sm leading-relaxed text-[#555]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Printed maps */}
          <section id="maps" className="scroll-mt-8 mb-14">
            <p className="text-sm tracking-[2px] text-primary uppercase font-medium mb-2">
              Printed maps
            </p>
            <h2 className="text-2xl font-bold text-[#444] mb-2">
              Undergrad cartography
            </h2>
            <p className="text-[#555] text-sm mb-6">2000–2004 · NSF REU and related work</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
              {printedMaps.undergrad.map((map) => (
                <figure key={map.src}>
                  <a href={map.src} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={map.src}
                      alt={map.title}
                      width={400}
                      height={300}
                      className="w-full h-auto rounded border border-[#ddd] hover:opacity-90 transition-opacity"
                    />
                  </a>
                  <figcaption className="mt-2">
                    <p className="font-medium text-sm text-[#444]">{map.title}</p>
                    <p className="text-xs text-[#888]">{map.year}</p>
                  </figcaption>
                </figure>
              ))}
            </div>

            <h2 className="text-2xl font-bold text-[#444] mb-2">
              Graduate school maps
            </h2>
            <p className="text-[#555] text-sm mb-6">2004–2007 · Thesis and papers</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {printedMaps.masters.map((map) => (
                <figure key={map.src}>
                  <a href={map.src} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={map.src}
                      alt={map.title}
                      width={400}
                      height={300}
                      className="w-full h-auto rounded border border-[#ddd] hover:opacity-90 transition-opacity"
                    />
                  </a>
                  <figcaption className="mt-2">
                    <p className="font-medium text-sm text-[#444]">{map.title}</p>
                    <p className="text-xs text-[#888]">{map.year}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* ArcGIS Desktop archive */}
          <section id="arcgis-desktop" className="scroll-mt-8 mb-14">
            <p className="text-sm tracking-[2px] text-primary uppercase font-medium mb-2">
              ArcGIS Desktop era
            </p>
            <h2 className="text-2xl font-bold text-[#444] mb-4">
              {arcgisDesktopArchive.title}
            </h2>
            <p className="leading-relaxed text-[#333] mb-4">
              {arcgisDesktopArchive.blurb}
            </p>
            <aside className="rounded-lg border border-primary/15 bg-[#f8f9fb] p-4 sm:p-5 mb-5">
              <p className="text-sm tracking-[2px] text-primary uppercase font-medium mb-2">
                Why it&apos;s archive-only
              </p>
              <p className="text-sm leading-relaxed text-[#555] mb-0">
                {arcgisDesktopArchive.retirementNote}
              </p>
            </aside>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm">
              <a
                href={arcgisDesktopArchive.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                GitHub repository ↗
              </a>
              <a
                href={arcgisDesktopArchive.notebookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open notebook export →
              </a>
            </div>
          </section>

          {/* Early Python */}
          <section id="python" className="scroll-mt-8">
            <p className="text-sm tracking-[2px] text-primary uppercase font-medium mb-2">
              Early Python GIS
            </p>
            <h2 className="text-2xl font-bold text-[#444] mb-4">
              Notebooks and tools
            </h2>
            <p className="leading-relaxed text-[#555] mb-6">
              Early experiments using Python for data science and GIS — Plotly,
              GeoPandas, ArcPy, and OSMNX. These are archived notebook exports,
              not production demos. Desktop-era ArcPy tooling lives in{" "}
              <a href="#arcgis-desktop" className="text-primary hover:underline">
                ArcGIS Desktop era
              </a>{" "}
              above.
            </p>
            <ul className="space-y-4">
              {earlyPythonProjects.map((project) => (
                <li
                  key={project.title}
                  className="border border-primary/10 rounded-lg p-4 bg-[#f8f9fb]"
                >
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#444] hover:text-primary"
                  >
                    {project.title}
                    {project.external ? " ↗" : ""}
                  </a>
                  <p className="text-sm text-[#555] mt-1 leading-relaxed">
                    {project.description}
                  </p>
                  {project.notebookHref ? (
                    <a
                      href={project.notebookHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-primary hover:underline mt-2"
                    >
                      Open notebook export →
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
