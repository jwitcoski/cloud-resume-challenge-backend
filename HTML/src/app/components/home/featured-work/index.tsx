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
                    <div className="flex flex-col max-w-3xl mx-auto py-10 px-4 sm:px-7">
                        <div className="flex flex-col xs:flex-row gap-5 items-center justify-between">
                            <p className="text-sm tracking-[2px] text-primary uppercase font-medium">Featured work</p>
                            <Button asChild variant={"outline"} className="h-auto">
                                <Link href={"#"} className="py-3 px-5">
                                    Download Resume
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 border-t border-primary/10">
                        {featureWork?.map((value: any, index: number) => {
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
                                    <div className="flex flex-col gap-1 sm:gap-2 px-2 min-h-[4.5rem]">
                                        <Link href={value?.url ?? "/"}><h4>{value?.title}</h4></Link>
                                        <div className="flex">
                                            <p>{value?.roles?.join(', ')}</p>
                                        </div>
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