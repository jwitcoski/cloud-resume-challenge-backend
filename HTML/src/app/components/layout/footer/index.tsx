import Link from "next/link"
import VisitorCount from "./VisitorCount"

const Footer = () => {
    return (
        <footer className="-translate-y-[1px] bg-white border-t border-primary/10">
            <div className="container">
                <div className="border-x border-primary/10">
                    <div className="max-w-3xl mx-auto flex flex-col gap-2 px-4 sm:px-7 py-4 md:py-7">
                        <VisitorCount />
                        <p>© 2026 Jonathan Witcoski — All rights reserved.</p>
                        <p><Link href={"/#contact"} className="hover:text-primary">Contact</Link> · <Link href={"/history/"} className="hover:text-primary">History</Link> · <Link href={"https://linkedin.com/in/jonathanwitcoski"} className="hover:text-primary" target="_blank" rel="noopener noreferrer">LinkedIn</Link></p>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
