"use client";
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { featureWork } from "@/data/site-data";

const FeaturedWork = () => {
    return (
        <section>
            <div className="container">
                <div className="border-x border-primary/10">
                    <div className="flex flex-col max-w-3xl mx-auto py-10 px-4 sm:px-7 gap-3">
                        <div className="flex flex-col xs:flex-row gap-5 items-center justify-between">
                            <p className="text-sm tracking-[2px] text-primary uppercase font-medium">Cloud architecture</p>
                            <Button asChild variant={"outline"} className="h-auto">
                                <Link href={"/Jonathan_Witcoski_Resume_2026.pdf"} className="py-3 px-5" download>
                                    Download Resume
                                </Link>
                            </Button>
                        </div>
                        <p className="text-secondary text-sm sm:text-base max-w-2xl">
                            Case studies in how cloud platforms and services ship a product — the Solutions Architect lens, not a feature checklist.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 border-t border-primary/10">
                        {featureWork?.map((value, index) => {
                            const isRightCol = index % 2 === 1;

                            return (
                                <div
                                    key={index}
                                    className={`group flex flex-col gap-3.5 sm:gap-5 p-3.5 sm:p-6 h-full ${isRightCol ? 'md:border-l md:border-primary/10' : ''}`}
                                >
                                    <Link href={value?.url ?? "/"} className="block aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
                                        <Image
                                            src={value?.image}
                                            alt={value?.title ?? "Image"}
                                            width={490}
                                            height={368}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ease-in-out"
                                        />
                                    </Link>
                                    <div className="flex flex-col gap-1.5 sm:gap-2 px-2">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <Link href={value?.url ?? "/"}><h4>{value?.title}</h4></Link>
                                            {"status" in value && value.status === "tbd" && (
                                                <span className="text-xs tracking-[0.14em] uppercase text-secondary border border-primary/15 px-1.5 py-0.5">
                                                    TBD
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-secondary">{value?.roles?.join(' · ')}</p>
                                        {value?.description && (
                                            <p className="text-sm sm:text-base text-primary/90 leading-relaxed">
                                                {value.description}
                                            </p>
                                        )}
                                        {value?.outcome && (
                                            <p className="text-sm sm:text-base text-primary/80 leading-relaxed">
                                                <span className="font-medium text-primary">Architecture choice: </span>
                                                {value.outcome}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </section>
    )
}

export default FeaturedWork
