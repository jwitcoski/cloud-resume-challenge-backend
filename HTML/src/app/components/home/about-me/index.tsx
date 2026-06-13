import { Badge } from "@/components/ui/badge";

const AboutMe = () => {
    const servicesBedge = ["ArcGIS Enterprise", "ArcGIS Online", "ArcGIS Pro", "ArcGIS API for JavaScript", "Python", "JavaScript", "SQL", "REST APIs", "SQL Server", "PostgreSQL/PostGIS", "Spatial Analyst", "ETL Automation", "AWS", "Azure", "React", "Power BI", "Docker", "Jenkins", "GitLab", "CI/CD", "Agile/Scrum"];
    return (
        <section>
            <div className="container">
                <div className="border-x border-primary/10 bg-[url('/images/about-me/about-me-bg.svg')] bg-cover bg-center bg-no-repeat">
                    <div className="flex flex-col gap-9 sm:gap-12 max-w-3xl mx-auto px-4 sm:px-7 py-11 md:py-20">
                        <div className="flex flex-col gap-4">
                            <p className="text-sm tracking-[2px] text-primary uppercase font-medium">About Me</p>
                            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px]">Hey there. I'm Jonathan — a GIS developer with 15+ years building <span className="border-b-2">enterprise geospatial applications</span> for CDC, utilities, and federal clients. I work in ArcGIS Enterprise, Python, JavaScript, and PostGIS, with a focus on web mapping, spatial databases, and automated ETL workflows.</h2>
                            <h5 className="text-secondary font-normal">Currently at DRT Strategies (CDC). Also building tools at <a href="https://vectorscopeai.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Vector Scope AI</a>. Previously National Grid, U.S. Census Bureau, C2 Solutions (Reston, VA), and Booz Allen Hamilton (FEMA/DHS).</h5>
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