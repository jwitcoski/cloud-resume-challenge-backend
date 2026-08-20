import { Badge } from "@/components/ui/badge";
import { skills } from "@/data/site-data";

const AboutMe = () => {
    return (
        <section>
            <div className="container">
                <div className="border-x border-primary/10 bg-[url('/images/about-me/about-me-bg.svg')] bg-cover bg-center bg-no-repeat">
                    <div className="flex flex-col gap-9 sm:gap-12 max-w-3xl mx-auto px-4 sm:px-7 py-11 md:py-20">
                        <div className="flex flex-col gap-4">
                            <p className="text-sm tracking-[2px] text-primary uppercase font-medium">About Me</p>
                            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px]">I&apos;m Jonathan, a Solutions Architect–track GIS engineer with 15+ years designing <span className="border-b-2">cloud and enterprise geospatial systems</span> for CDC, utilities, and federal agencies. I pick ArcGIS, AWS, and spatial data pipelines based on what the system needs to run reliably.</h2>
                            <h5 className="text-secondary font-normal">Currently Geospatial Engineer at INCATech, on U.S. Postal Inspection Service (USPIS) work. Previously a CDC Geographer (federal employee, then DRT Strategies contractor), National Grid, the U.S. Census Bureau, C2 Solutions, and Booz Allen Hamilton (DHS). Studying for AWS Solutions Architect – Associate. On the side I run <a href="https://vectorscopeai.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Vector Scope AI</a>, a collaborative map editing product with approvals and a versioned GeoParquet lake on AWS.</h5>
                        </div>
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-primary uppercase font-medium">Core Skills</p>
                            <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                                {skills.map((skill) => {
                                    const isPrimary = skill.level === "primary";
                                    return (
                                        <Badge
                                            key={skill.name}
                                            variant={isPrimary ? "default" : "outline"}
                                            className={
                                                isPrimary
                                                    ? "py-2 px-3.5 rounded-lg text-sm sm:text-base font-semibold"
                                                    : "py-1.5 px-3 rounded-lg"
                                            }
                                        >
                                            <p className={`font-medium ${isPrimary ? "text-primary-foreground text-sm sm:text-base" : "text-xs sm:text-sm text-primary"}`}>
                                                {skill.name}
                                            </p>
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AboutMe
