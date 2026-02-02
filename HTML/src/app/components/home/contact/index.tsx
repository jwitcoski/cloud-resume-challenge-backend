"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xqellkgd";

export default function Contact() {
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus("submitting");
        const form = e.currentTarget;
        const formData = new FormData(form);

        try {
            const res = await fetch(FORMSPREE_ENDPOINT, {
                method: "POST",
                body: formData,
                headers: { Accept: "application/json" },
            });
            if (res.ok) {
                setStatus("success");
                form.reset();
            } else {
                setStatus("error");
            }
        } catch {
            setStatus("error");
        }
    }

    return (
        <section id="contact">
            <div className="container">
                <div className="border-x border-primary/10">
                    <div className="flex flex-col max-w-3xl mx-auto px-4 sm:px-7 py-10 md:py-16">
                        <p className="text-sm tracking-[2px] text-primary uppercase font-medium mb-6">Contact</p>
                        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] mb-8">Get in touch</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="name" className="text-sm font-medium text-primary">Name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 border border-primary/20 rounded-lg bg-background text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Your name"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="email" className="text-sm font-medium text-primary">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full px-4 py-3 border border-primary/20 rounded-lg bg-background text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="message" className="text-sm font-medium text-primary">Message</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    rows={5}
                                    className="w-full px-4 py-3 border border-primary/20 rounded-lg bg-background text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                                    placeholder="Your message"
                                />
                            </div>
                            {status === "success" && (
                                <p className="text-sm text-green-600">Thanks! Your message was sent.</p>
                            )}
                            {status === "error" && (
                                <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
                            )}
                            <Button
                                type="submit"
                                disabled={status === "submitting"}
                                className="w-fit"
                            >
                                {status === "submitting" ? "Sending…" : "Send message"}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
