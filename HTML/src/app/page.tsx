import Divider from "./components/divider"
import AboutMe from "./components/home/about-me"
import Contact from "./components/home/contact"
import Education from "./components/home/education"
import Experience from "./components/home/experience"
import FeaturedWork from "./components/home/featured-work"
import HeroSection from "./components/home/hero-section"
import PlatformLabs from "./components/home/platform-labs"
import SideProjects from "./components/home/side-projects"

const page = () => {
  return (
    <main>
      <HeroSection/>
      <Divider/>
      <AboutMe/>
      <Divider/>
      <FeaturedWork/>
      <Divider/>
      <SideProjects/>
      <Divider/>
      <PlatformLabs/>
      <Divider/>
      <Experience/>
      <Divider/>
      <Education/>
      <Divider/>
      <Contact/>
      <Divider/>
    </main>
  )
}

export default page
