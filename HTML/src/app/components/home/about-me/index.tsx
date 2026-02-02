import { Badge } from "@/components/ui/badge";

const AboutMe = () => {
    const servicesBedge = ["GeoAI", "Spatial Data Engineering", "Python", "JavaScript", "SQL", "REST APIs", "ETL Automation", "Cloud-Native Architecture", "Docker", "Jenkins", "GitLab", "CI/CD", "FedRAMP/FISMA", "Azure", "AWS", "ArcGIS Enterprise", "PostgreSQL/PostGIS", "Agile/Scrum", "Technical Project Management"];
    return (
        <section>
            <div className="container">
                <div className="border-x border-primary/10 bg-[url('/images/about-me/about-me-bg.svg')] bg-cover bg-center bg-no-repeat">
                    <div className="flex flex-col gap-9 sm:gap-12 max-w-3xl mx-auto px-4 sm:px-7 py-11 md:py-20">
                        <div className="flex flex-col gap-4">
                            <p className="text-sm tracking-[2px] text-primary uppercase font-medium">About Me</p>
                            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px]">Hey there. I'm Jonathan — Founder & Principal at <a href="https://vectorscopeai.com" target="_blank" rel="noopener noreferrer" className="bg-[linear-gradient(90deg,_rgba(243,202,77,0.4)_0%,_rgba(243,202,77,0.05)_100%)] hover:underline">Vector Scope AI</a>, delivering <span className="border-b-2">spatial intelligence solutions</span> for government and enterprise. I lead AI-powered geospatial work: cloud-native ETL, petabyte-scale analytics, and automation that cuts manual effort by 80%+.</h2>
                            <h5 className="text-secondary font-normal">Previously at DRT Strategies (CDC), National Grid, U.S. Census Bureau, and Booz Allen Hamilton.</h5>
                        </div>
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-primary uppercase font-medium">Core Skills</p>
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                {servicesBedge?.map((value, index) => {
                                    return (
                                        <Badge variant={"outline"} key={index} className="py-1.5 px-3 rounded-lg">
                                            <p className="text-xs sm:text-sm font-medium text-primary">{value}</p>
                                        </Badge>
                                    )
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