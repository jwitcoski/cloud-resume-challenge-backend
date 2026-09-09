"use client";
import Image from "next/image";
import Link from "next/link";
import { sideProjects } from "@/data/site-data";

const SideProjects = () => {
  return (
    <section>
      <div className="container">
        <div className="border-x border-primary/10">
          <div className="flex flex-col max-w-3xl mx-auto gap-3 px-4 sm:px-7 py-9 md:py-12">
            <p className="text-sm tracking-[2px] text-primary uppercase font-medium">
              Side projects
            </p>
            <p className="text-secondary text-sm sm:text-base max-w-2xl">
              Maps, tools, and experiments — GIS craft without the cloud architecture case study.
            </p>
          </div>
          <ul className="border-t border-primary/10 divide-y divide-primary/10">
            {sideProjects.map((project) => (
              <li key={project.title}>
                <Link
                  href={project.url}
                  className="group flex gap-4 sm:gap-5 items-center px-4 sm:px-7 py-4 sm:py-5 max-w-3xl mx-auto hover:bg-primary/5 transition-colors"
                >
                  <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={project.image}
                      alt=""
                      width={80}
                      height={80}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-base sm:text-lg group-hover:underline underline-offset-2">
                      {project.title}
                    </h4>
                    <p className="text-sm text-secondary leading-snug">
                      {project.blurb}
                    </p>
                    <p className="text-xs text-secondary/80">
                      {project.roles.join(" · ")}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default SideProjects;
