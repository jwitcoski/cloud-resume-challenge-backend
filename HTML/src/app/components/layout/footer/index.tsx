import Link from "next/link"

const Footer = () => {
    return (
        <footer className="-translate-y-[1px] bg-white border-t border-primary/10">
            <div className="container">
                <div className="border-x border-primary/10">
                    <div className="max-w-3xl mx-auto  gap-10 sm:gap-16 px-4 sm:px-7 py-4 md:py-7">
                        <p>© 2026 Jonathan Witcoski — All rights reserved.</p>
                        <p><Link href={"/#contact"} className="hover:text-primary">Contact</Link> · <Link href={"https://linkedin.com/in/jonathanwitcoski"} className="hover:text-primary" target="_blank" rel="noopener noreferrer">LinkedIn</Link></p>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer