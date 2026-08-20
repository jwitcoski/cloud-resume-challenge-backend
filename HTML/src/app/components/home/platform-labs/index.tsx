import Link from "next/link";

const labs = [
  { href: "/maptiler-playground/", name: "MapTiler", kind: "Maps", ready: true },
  { href: "/mapbox-playground/", name: "Mapbox", kind: "Maps", ready: true },
  { href: "/esri-playground/", name: "Esri", kind: "Maps", ready: true },
  { href: "/google-maps-playground/", name: "Google Maps", kind: "Maps", ready: true },
  { href: "/aws-playground/", name: "AWS", kind: "Cloud", ready: true },
  { href: "/azure-playground/", name: "Azure", kind: "Cloud", ready: false },
  { href: "/gcp-playground/", name: "GCP", kind: "Cloud", ready: false },
];

const PlatformLabs = () => {
  return (
    <section>
      <div className="container">
        <div className="border-x border-primary/10">
          <div className="flex flex-col max-w-3xl mx-auto gap-8 px-4 sm:px-7 py-9 md:py-16">
            <div className="flex flex-col gap-3">
              <p className="text-sm tracking-[2px] text-primary uppercase font-medium">
                Platform labs
              </p>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px]">
                Mapping and cloud playgrounds
              </h2>
              <p className="text-secondary">
                Each link opens a short write-up: when I pick that platform, what I&apos;ve built with it, and what is still in progress.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {labs.map((lab) => (
                <Link
                  key={lab.href}
                  href={lab.href}
                  className="group flex flex-col gap-1 border border-primary/10 px-3.5 py-3.5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-xs uppercase tracking-[0.12em] text-secondary">
                    {lab.kind}
                    {!lab.ready ? " · hub" : ""}
                  </span>
                  <span className="text-base sm:text-lg font-medium text-primary group-hover:underline underline-offset-2">
                    {lab.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformLabs;
