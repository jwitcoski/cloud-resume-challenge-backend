import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Cloud Resume Challenge Journey | Jonathan Witcoski",
  description: "My journey completing the Cloud Resume Challenge — AWS, S3, CloudFront, DynamoDB, Lambda, CI/CD, and more.",
};

export default function CloudResumeChallengePage() {
  return (
    <main className="min-h-screen bg-[#f4f4f4] text-[#333]">
      <div className="container max-w-3xl mx-auto px-4 sm:px-7 py-10">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6 sm:p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-8"
          >
            ← Back to resume
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#444] mb-6">
            Cloud Resume Challenge Journey
          </h1>
          <p className="leading-relaxed mb-4">Hello everyone, I&apos;m Jonathan.</p>
          <p className="leading-relaxed mb-6">
            I&apos;ve been working near the cloud industry for the past few years, but my
            focus has primarily been on utilizing products already produced in cloud
            services rather than designing them. With some free time on my hands, I
            decided to challenge myself by taking on the{" "}
            <a
              href="https://cloudresumechallenge.dev/docs/the-challenge/aws/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              Cloud Resume Challenge
            </a>
            . After two years of effort, I&apos;m thrilled to announce that I&apos;ve completed
            the challenge!
          </p>

          <figure className="my-8">
            <Image
              src="/images/cloud-resume-challenge/CloudResumeArchitecture.png"
              alt="AWS Services Architecture"
              width={800}
              height={500}
              className="w-full h-auto rounded border border-[#ddd]"
            />
            <figcaption className="text-center italic text-sm mt-2 mb-6 text-[#666]">
              AWS services used and how they integrate with the entire architecture.
              (Image credit: Cody Waits)
            </figcaption>
          </figure>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            2021: The Beginning
          </h2>
          <h3 className="text-xl font-semibold text-[#444] mt-6 mb-3">
            Step 1: Certification
          </h3>
          <p className="leading-relaxed mb-6">
            In 2021, I began my journey by earning the AWS Cloud Practitioner
            certification. This introductory certification helped me gain a solid
            understanding of AWS, the industry-leading cloud platform. It took me about
            two weeks of study time to pass the exam. I&apos;m now preparing for the{" "}
            <Link href="/aws-solutions-architect-study.html" className="text-[#007bff] hover:underline">
              Solutions Architect – Associate (SAA-C03)
            </Link>{" "}
            with a nightly study plan tied to my production projects.
          </p>
          <figure className="my-8">
            <Image
              src="https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Cloud-Practitioner_badge.634f8a21af2e0e956ed8905a72366146ba22b74c.png"
              alt="AWS Cloud Practitioner Certification"
              width={120}
              height={120}
              unoptimized
              className="rounded"
            />
            <figcaption className="text-center italic text-sm mt-2 mb-6 text-[#666]">
              AWS Cloud Practitioner Certification Badge
            </figcaption>
          </figure>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            2023: Building the Foundation
          </h2>
          <h3 className="text-xl font-semibold text-[#444] mt-6 mb-3">
            Steps 2 and 3: HTML and CSS (4 hours | Feb 2023)
          </h3>
          <p className="leading-relaxed mb-6">
            Using a{" "}
            <a
              href="https://themes.3rdwavemedia.com/bootstrap-templates/personal/devblog-free-bootstrap-5-blog-template-for-developers/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              Bootstrap template
            </a>
            , I quickly put together my{" "}
            <a
              href="https://witcoskitech.com/HTML/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              resume
            </a>{" "}
            over the course of several evenings while watching TV. Thanks to the basic
            web design skills I&apos;ve acquired over the years through platforms like{" "}
            <a
              href="https://www.codecademy.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              Codecademy
            </a>
            , this part was fairly straightforward.
          </p>

          <h3 className="text-xl font-semibold text-[#444] mt-6 mb-3">
            Steps 4 and 5: Static Website and HTTPS (2 hours | Feb 2023)
          </h3>
          <p className="leading-relaxed mb-6">
            Next, I created an S3 bucket named <code className="bg-[#f4f4f4] px-1.5 py-0.5 rounded">witcoskitech.com</code> in the
            us-east-1 region (shout out to Northern Virginia, just a few miles from my
            house). I set all features and encryption to default, then uploaded the
            files from Steps 2 and 3 into the S3 bucket. To make the website accessible
            via HTTPS, I used CloudFront, setting the S3 bucket as the origin and
            adjusting the Origin access to &quot;Origin access control settings
            (recommended).&quot; After creating the CloudFront distribution and
            copying the S3 bucket policy, I was finally able to see my website live!
          </p>
          <figure className="my-8">
            <Image
              src="/images/cloud-resume-challenge/Chatgpt_cartoon2.png"
              alt="Cartoon of a stressed man working on computer while managing kids"
              width={600}
              height={400}
              className="w-full h-auto rounded border border-[#ddd]"
            />
            <figcaption className="text-center italic text-sm mt-2 mb-6 text-[#666]">
              An illustration generated by ChatGPT through DALL-E, showing a stressed man
              holding a baby while attempting to work on a computer.
            </figcaption>
          </figure>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            2024: Overcoming Obstacles
          </h2>
          <h3 className="text-xl font-semibold text-[#444] mt-6 mb-3">
            Step 6: DNS (30 minutes… scratch that, 80 hours | Feb 2023 to April 2024)
          </h3>
          <p className="leading-relaxed mb-4">
            I purchased the domain <code className="bg-[#f4f4f4] px-1.5 py-0.5 rounded">witcoskitech.com</code> through Route 53
            and used AWS Certificate Manager to procure an SSL certificate for the site.
            However, this is where things went terribly wrong. For some reason, my S3
            bucket wouldn&apos;t connect with my domain. I tried blog posts, AI chatbots,
            and posting on help forums, but nothing worked. I eventually gave up,
            especially as life got in the way—my first son was born!
          </p>
          <p className="leading-relaxed mb-4">
            In April 2024, an anonymous member of the Cloud Challenge Discord community
            finally replied to my post. We spent an hour trying to solve the issue but
            to no avail. Desperate, I posted a $20 bounty on Upwork with screenshots.
            Within two days, I received multiple solutions. A fantastic individual
            casually mentioned, &quot;Apparently, your name servers are not configured
            properly.&quot; Shout out to{" "}
            <a
              href="https://www.upwork.com/freelancers/romanz153"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              Roman Z.
            </a>{" "}
            for guiding me through the solution:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>
              Go to Route 53 / Registered domains / <code className="bg-[#f4f4f4] px-1.5 py-0.5 rounded">witcoskitech.com</code> /
              Edit name servers and change them to match those from Route 53 / Hosted
              zones / <code className="bg-[#f4f4f4] px-1.5 py-0.5 rounded">witcoskitech.com</code> / NS record.
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-[#444] mt-6 mb-3">
            Steps 7-10: JavaScript, Database, API, Python (20 hours | May 2024 to July
            2024)
          </h3>
          <p className="leading-relaxed mb-6">
            After a break to welcome my second son, I resumed the challenge. By this
            point, AI chatbots like ChatGPT had become popular, and I decided to use
            one to help me continue. I know it&apos;s a bit of cheating, but with a
            2-year-old and a newborn, I could only work on the challenge late at night
            after they fell asleep.
          </p>

          <figure className="my-8">
            <Image
              src="/images/cloud-resume-challenge/Chatgpt_cartoon.png"
              alt="Cartoon of a stressed man working on computer while managing kids"
              width={600}
              height={400}
              className="w-full h-auto rounded border border-[#ddd]"
            />
            <figcaption className="text-center italic text-sm mt-2 mb-6 text-[#666]">
              Here is the cartoon illustration by ChatGPT through DALL-E of a stressed
              man holding a baby and managing a two-year-old while trying to work on a
              computer. This image captures the light-hearted and humorous scenario of
              balancing the Cloud Resume Challenge with family life.
            </figcaption>
          </figure>

          <p className="leading-relaxed mb-4">
            Since no one really wants to read a resume, I decided to expand the
            challenge into something more interesting by showcasing my cartographic and
            geographic skills. I created ski maps using an open-source GIS program
            called QGIS, utilizing DEM data from{" "}
            <a
              href="https://opentopography.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              OpenTopography
            </a>{" "}
            and ski map data from{" "}
            <a
              href="https://openstreetmap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              OpenStreetMap.org
            </a>
            . I bought <code className="bg-[#f4f4f4] px-1.5 py-0.5 rounded">globalskiatlas.com</code> to host this project.
          </p>
          <figure className="my-8">
            <Image
              src="https://globalskiatlas.com/data/North%20America/United%20States/Pennsylvania/map/Jack%20Frost%20Mountain%20Ski%20Area.jpeg"
              alt="Jack Frost Ski Mountain Ski Area"
              width={600}
              height={400}
              unoptimized
              className="w-full h-auto rounded border border-[#ddd]"
            />
            <figcaption className="text-center italic text-sm mt-2 mb-6 text-[#666]">
              Jack Frost Ski Mountain Ski Area Map
            </figcaption>
          </figure>

          <p className="leading-relaxed mb-4">
            The inspiration for Global Ski Atlas came from a table of ski resorts in
            the U.S. by Stuart Winchester at{" "}
            <a
              href="https://www.stormskiing.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              Storm Skiing
            </a>
            , a collection of ski resort maps at{" "}
            <a
              href="https://skimap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              skimap.org
            </a>
            , and the winter sports data display at{" "}
            <a
              href="https://openskimap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              openskimap.org
            </a>
            .
          </p>
          <figure className="my-8">
            <Image
              src="https://globalskiatlas.com/blog/qgismodel.png"
              alt="QGIS Model to output ski maps"
              width={600}
              height={400}
              unoptimized
              className="w-full h-auto rounded border border-[#ddd]"
            />
            <figcaption className="text-center italic text-sm mt-2 mb-6 text-[#666]">
              QGIS Model used to generate ski maps. While not directly relevant to the
              Cloud Resume Challenge, mastering QGIS for this project was a challenge in
              itself. Getting the symbology, labeling, and even figuring out the angle
              to align the map (making the highest point north and lowest point south)
              pushed me to explore QGIS in ways I hadn&apos;t before in my career.
            </figcaption>
          </figure>

          <p className="leading-relaxed mb-4">
            I started by creating the DynamoDB databases. Setting up the visitor counter
            was easy with instructions from ChatGPT. Writing the JavaScript and the
            Python within the Lambda function was also straightforward, with most
            errors quickly resolved by the AI assistant. However, I got stuck on the
            API. A helpful comment on my Stack Overflow post pointed out that my Lambda
            function settings were incorrect. I switched to using Cursor.sh, which,
            along with Postman, helped me get the Lambda functions up and running.
          </p>
          <p className="leading-relaxed mb-6">
            For my other domain, which already had a database, I converted a Google
            Sheets file into a CSV file in the S3 bucket. From there, I easily
            converted it into a DynamoDB database. I currently only have Pennsylvania
            ski resorts in the database but can add more as needed. Next, I needed to
            create a Lambda function that would export HTML based on users selecting a
            resort. Despite numerous errors, I eventually got it all done with the help
            of Postman and some chatbot assistance.
          </p>

          <h3 className="text-xl font-semibold text-[#444] mt-6 mb-3">
            Steps 12-15: Infrastructure as Code, Source Control, and CI/CD (20 hours |
            July-August 2024)
          </h3>
          <p className="leading-relaxed mb-6">
            Next up was Infrastructure as Code. I admit, it had been a while since I
            last used the command prompt. However, with the help of my trusty AI
            sidekick, I used AWS SAM to define and deploy all my backend resources. I
            then opened up my GitHub account and created a repository for version
            control. Initially, I made a mistake by putting all the code, including the
            front end, in one repository. After six attempts, I finally got the code to
            deploy correctly. I then separated the front end and backend into separate
            deployments. If I were to do this again, I would separate the front end and
            backend from the start—something I plan on doing next with{" "}
            <code className="bg-[#f4f4f4] px-1.5 py-0.5 rounded">globalskiatlas.com</code>. I ran into a small hiccup where my
            code created a new DynamoDB database, but I managed to reroute my API
            Gateway resource to the correct one.
          </p>
          <figure className="my-8">
            <Image
              src="/images/cloud-resume-challenge/path_to_your_github_actions_workflow_screenshot.png"
              alt="GitHub Actions Workflow"
              width={800}
              height={400}
              className="w-full h-auto rounded border border-[#ddd]"
            />
            <figcaption className="text-center italic text-sm mt-2 mb-6 text-[#666]">
              My GitHub Actions Workflow for CI/CD
            </figcaption>
          </figure>

          <h3 className="text-xl font-semibold text-[#444] mt-6 mb-3">
            Future Plans: Automating the Data Pipeline
          </h3>
          <p className="leading-relaxed mb-4">
            As I look to the future, I&apos;m excited to take this project to the next
            level. My next challenge? Automating the entire data flow process. Here&apos;s
            what I have in mind:
          </p>
          <div className="flex flex-wrap items-center gap-2 my-6 p-4 bg-[#f4f4f4] rounded-lg">
            <span className="px-3 py-2 bg-white border rounded">Google Sheets</span>
            <span>➡️</span>
            <span className="px-3 py-2 bg-white border rounded">CSV in S3</span>
            <span>➡️</span>
            <span className="px-3 py-2 bg-white border rounded">DynamoDB</span>
          </div>
          <p className="leading-relaxed mb-4">
            The grand plan is to create a Lambda function that springs into action
            whenever the CSV file in S3 gets a refresh. This way, our DynamoDB database
            will always be in sync with the latest data, without any manual
            intervention. It&apos;s all about making the system smarter and more
            efficient!
          </p>
          <p className="leading-relaxed mb-6">
            This automation will not only streamline our workflow but also serve as a
            practical application of the skills I&apos;ve honed through Steps 12-15 of
            the Cloud Resume Challenge. It&apos;s a perfect blend of what I&apos;ve learned and
            where I want to go next in my cloud journey.
          </p>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            The Final Step
          </h2>
          <h3 className="text-xl font-semibold text-[#444] mt-6 mb-3">
            Step 16: Write a Blog Post (4 hours | August 2024)
          </h3>
          <p className="leading-relaxed mb-6">
            Now, I&apos;m on the last step. I still have work to do on my second skiing
            website, and I plan on earning more advanced cloud certifications. This
            challenge has introduced me to a dozen Amazon applications, opening the
            door to cloud computing for this geography nerd. Inspired by{" "}
            <a
              href="https://www.linkedin.com/in/mbforr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline"
            >
              Matt Forrest
            </a>
            , who frequently posts about Cloud GIS, I hope to continue expanding my
            skill set in digital cartography and GIS.
          </p>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            Thank You and Further Resources
          </h2>
          <p className="leading-relaxed mb-4">
            Thank you for taking the time to read through my Cloud Resume Challenge
            journey! If you&apos;re interested in diving deeper into the code and
            projects mentioned, here are the relevant GitHub repositories:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>
              Online Resume (Backend and Frontend):{" "}
              <a
                href="https://github.com/jwitcoski/cloud-resume-challenge-backend"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                Cloud-resume-challenge-backend
              </a>
            </li>
            <li>
              QGIS Model for Ski Atlas:{" "}
              <a
                href="https://github.com/jwitcoski/skiatlas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                skiatlas QGIS
              </a>
            </li>
            <li>
              Global Ski Atlas Frontend (Future Site):{" "}
              <a
                href="https://github.com/jwitcoski/globalskiatlas--frontend"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                globalskiatlas frontend
              </a>
            </li>
            <li>
              Global Ski Atlas Backend (Future Site):{" "}
              <a
                href="https://github.com/jwitcoski/globalskiatlas--backend"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                globalskiatlas backend
              </a>
            </li>
          </ul>

          <p className="leading-relaxed mb-4">
            If you&apos;d like to connect or follow my future projects, you can find me
            on:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>
              LinkedIn:{" "}
              <a
                href="https://www.linkedin.com/in/jonathanwitcoski/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                https://www.linkedin.com/in/jonathanwitcoski/
              </a>
            </li>
            <li>
              Twitter (X):{" "}
              <a
                href="https://x.com/MappingThings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                @MappingThings
              </a>{" "}
              and{" "}
              <a
                href="https://x.com/GlobalSkiAtlas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                @GlobalSkiAtlas
              </a>
            </li>
          </ul>

          <p className="leading-relaxed mb-8">
            Feel free to reach out if you have any questions or just want to chat about
            Cloud Computing, GIS, or Skiing!
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            ← Back to resume
          </Link>
        </div>
      </div>
    </main>
  );
}
