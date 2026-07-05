import Link from "next/link";
import ExamChecklist from "./ExamChecklist";
import { countByReadiness, examServices } from "@/data/saa-c03-exam-checklist";
import { listQuizSummaries } from "@/data/study-quizzes";
import { listGuideSummaries } from "@/data/study-guides";

export const metadata = {
  title: "AWS Solutions Architect Study Plan | Jonathan Witcoski",
  description:
    "Nightly SAA-C03 study plan, hands-on labs on my repos, and an honest inventory of AWS services I already use in production.",
};

type ServiceRow = {
  service: string;
  level: "Production" | "Hands-on" | "Documented" | "Exam gap";
  where: string;
};

const knownServices: ServiceRow[] = [
  { service: "Amazon S3", level: "Production", where: "Frontend: static site + public GeoParquet · Backend: pipeline output + Iceberg" },
  { service: "Amazon CloudFront", level: "Production", where: "Frontend: globalskiatlas.com CDN, API origin routing, CloudFront Functions" },
  { service: "AWS Lambda", level: "Production", where: "Frontend: wiki API, Iceberg stats, Bedrock chat · Backend: stats API (SAM)" },
  { service: "Amazon API Gateway", level: "Production", where: "Frontend: wiki + skiing-ai HTTP APIs via SAM" },
  { service: "Amazon DynamoDB", level: "Production", where: "Frontend: WikiPages, WikiRevisions, WikiComments" },
  { service: "AWS IAM", level: "Production", where: "Frontend + Backend: deploy roles, ECS task/execution roles, bucket policies" },
  { service: "AWS CloudFormation / SAM", level: "Production", where: "Frontend: template.yaml · Backend: sam-iceberg-stats" },
  { service: "Amazon ECS + Fargate", level: "Production", where: "Backend: continent-scale OSM → GeoParquet pipeline" },
  { service: "Amazon ECR", level: "Production", where: "Backend: pipeline container images via GitHub Actions" },
  { service: "Amazon Cognito", level: "Production", where: "Frontend: wiki user pools, JWT validation in Lambda" },
  { service: "Amazon Bedrock", level: "Production", where: "Frontend: skiing AI · Backend: resort wiki copy generation (Nova)" },
  { service: "AWS Glue Data Catalog", level: "Hands-on", where: "Backend: Iceberg table registration (register_iceberg.py)" },
  { service: "Apache Iceberg on S3", level: "Hands-on", where: "Backend: versioned analytics in globalskiatlas-backend-k8s-output" },
  { service: "Amazon Route 53", level: "Hands-on", where: "Frontend: globalskiatlas.com DNS (basic records)" },
  { service: "AWS Certificate Manager", level: "Hands-on", where: "Frontend: HTTPS certs for CloudFront" },
  { service: "Amazon CloudWatch Logs", level: "Hands-on", where: "Frontend: Lambda logs · Backend: ECS Fargate log groups" },
  { service: "GitHub Actions → AWS", level: "Production", where: "Frontend: S3 sync · Backend: ECR push, ECS run-task, SAM deploy" },
  { service: "Amazon VPC (partial)", level: "Documented", where: "Backend: Fargate awsvpc, subnets/SG — not full multi-tier design" },
  { service: "Amazon EventBridge", level: "Documented", where: "Backend: monthly ECS schedule documented, not yet implemented" },
  { service: "Amazon Athena", level: "Documented", where: "Backend: Iceberg docs; queries today via PyIceberg, not Athena SQL" },
];

const gapServices = [
  "Amazon RDS / Aurora / Aurora Serverless",
  "Elastic Load Balancing (ALB, NLB, GWLB)",
  "NAT Gateway + multi-tier VPC design",
  "Amazon SQS, SNS, Step Functions",
  "Amazon ElastiCache",
  "AWS KMS (customer-managed keys)",
  "AWS Secrets Manager vs SSM Parameter Store",
  "AWS WAF + Shield",
  "AWS CloudTrail, Config, GuardDuty",
  "Amazon EC2 + Auto Scaling + EBS volume types",
  "S3 Glacier / lifecycle / Intelligent-Tiering",
  "Route 53 routing policies (weighted, failover, latency)",
  "AWS DMS, DataSync, Snow Family",
  "Cost Explorer, Savings Plans, Compute Optimizer",
];

const examCounts = countByReadiness(examServices);

type NightPlan = {
  night: number;
  week: number;
  title: string;
  minutes: [number, number, number];
  blocks: [string, string, string];
  lab?: string;
};

const nightlyPlan: NightPlan[] = [
  { night: 1, week: 1, title: "Baseline + Domain 1 intro", minutes: [30, 60, 30], blocks: ["Read SAA-C03 exam guide domains", "Review Security + Management services (Week 1 categories)", "10 practice questions (security)"], lab: "Audit IAM policies on deploy user and ECS roles" },
  { night: 2, week: 1, title: "Lab 1A — KMS + S3 encryption", minutes: [20, 70, 30], blocks: ["KMS key policies vs IAM policies", "Enable SSE-KMS on a test prefix in witcoskitech bucket", "Verify deploy still works"], lab: "Cloud Resume Challenge — SSE-KMS" },
  { night: 3, week: 1, title: "Lab 1B — Secrets Manager", minutes: [20, 70, 30], blocks: ["Secrets Manager vs Parameter Store", "Move Cognito config to Secrets Manager", "Tighten Lambda GetSecretValue scope"], lab: "Global Ski Atlas frontend — wiki auth secrets" },
  { night: 4, week: 1, title: "Lab 1C — WAF on CloudFront", minutes: [20, 70, 30], blocks: ["Managed rule groups overview", "Attach WAF Web ACL to distribution", "Test wiki POST still works"], lab: "witcoskitech.com or globalskiatlas.com" },
  { night: 5, week: 1, title: "CloudTrail + Config + Access Analyzer", minutes: [30, 60, 30], blocks: ["CloudTrail vs Config vs GuardDuty", "Enable trail + two Config rules", "Fix one over-broad IAM finding"], lab: "Account-level security" },
  { night: 6, week: 1, title: "Week 1 review", minutes: [20, 40, 60], blocks: ["Check off remaining Week 1 category services", "25 timed practice questions", "Domain 1 checkpoints + Week 1 teardown (week1-teardown-full.sh)"], lab: "Full study-lab teardown — Night 5 observability labs" },
  { night: 7, week: 1, title: "Week 1 consolidation", minutes: [30, 30, 60], blocks: ["Draw security architecture for both sites", "15 practice questions (missed topics)", "Plan Week 2 VPC diagram on paper"], lab: undefined },

  { night: 8, week: 2, title: "VPC fundamentals", minutes: [40, 50, 30], blocks: ["Public/private subnets, IGW, NAT, SG vs NACL", "Draw 2-AZ VPC for Fargate pipeline", "5 flashcards: NAT vs IGW"], lab: "Paper design before build" },
  { night: 9, week: 2, title: "Lab 2A — VPC build (part 1)", minutes: [20, 80, 20], blocks: ["Create VPC + subnets + route tables", "NAT Gateway in public subnet", "Document IDs in AWS_ECS_DEPLOYMENT.md"], lab: "Global Ski Atlas backend — aws/" },
  { night: 10, week: 2, title: "Lab 2A — private Fargate (part 2)", minutes: [20, 80, 20], blocks: ["Run Iceland ECS task in private subnet", "Confirm S3 output lands", "Troubleshoot SG if task fails"], lab: "ECS run-task private subnets" },
  { night: 11, week: 2, title: "ELB + ALB theory", minutes: [50, 40, 30], blocks: ["ALB vs NLB vs GWLB use cases", "Target groups + health checks", "20 practice questions (resilience)"], lab: undefined },
  { night: 12, week: 2, title: "Lab 2B — EventBridge schedule", minutes: [20, 70, 30], blocks: ["EventBridge cron for monthly pipeline", "IAM role for ECS target", "CloudWatch alarm on task failure"], lab: "Implement doc in AWS_ECS_DEPLOYMENT.md §242" },
  { night: 13, week: 2, title: "Lab 2C — SQS decoupling (part 1)", minutes: [30, 60, 30], blocks: ["SQS standard vs FIFO, DLQ", "Create queue + DLQ via SAM", "Pipeline sends message on success"], lab: "New sam-pipeline-notify stack" },
  { night: 14, week: 2, title: "Lab 2C — SQS (part 2) + SNS", minutes: [20, 70, 30], blocks: ["Lambda consumer triggers iceberg stats upload", "SNS email on success/failure", "Compare SNS fan-out vs SQS"], lab: "sam-pipeline-notify" },

  { night: 15, week: 3, title: "RDS + Aurora deep dive", minutes: [60, 30, 30], blocks: ["RDS Multi-AZ vs read replicas vs Aurora", "Aurora Serverless v2 + RDS Proxy", "20 practice questions (databases)"], lab: undefined },
  { night: 16, week: 3, title: "Lab 2D — Aurora study stack (part 1)", minutes: [20, 80, 20], blocks: ["SAM/CFN: VPC + Aurora Serverless v2 private", "Security group: Lambda → Aurora only", "Create sample relational table"], lab: "Cloud Resume Challenge rds-study/" },
  { night: 17, week: 3, title: "Lab 2D — Aurora (part 2)", minutes: [20, 80, 20], blocks: ["Lambda reads/writes Postgres row", "Compare to DynamoDB visitor counter", "Document when to pick each"], lab: "rds-study/" },
  { night: 18, week: 3, title: "DynamoDB resilience", minutes: [30, 60, 30], blocks: ["PITR + Streams on wiki tables", "Stub stream Lambda", "Global tables awareness read"], lab: "Global Ski Atlas frontend — wiki tables" },
  { night: 19, week: 3, title: "DR + backup patterns", minutes: [50, 40, 30], blocks: ["RTO/RPO scenarios", "AWS Backup vs snapshots vs cross-region", "25 practice questions (resilience)"], lab: undefined },
  { night: 20, week: 3, title: "Migration — DMS + S3 staging", minutes: [30, 60, 30], blocks: ["DMS full load + CDC vs DataSync/Snowball", "Lab: DynamoDB export to S3 (night-20-lab-migration-setup)", "25 practice questions (Migration and Transfer)"], lab: "saa-study-gsa-migration bucket + DynamoDB export — Night 18 PITR prerequisite" },
  { night: 21, week: 3, title: "VPN + Direct Connect + TGW", minutes: [60, 30, 30], blocks: ["Site-to-Site VPN vs DX vs TGW", "PrivateLink vs VPC peering", "Diagram 3 exam scenarios"], lab: "Theory night — no deploy" },
  { night: 22, week: 3, title: "Week 3 review", minutes: [20, 40, 60], blocks: ["Draw 3-tier VPC + ALB + Aurora", "30 timed practice questions", "Tear-down checklist for Aurora if done"], lab: undefined },

  { night: 23, week: 4, title: "Lab 3A — ElastiCache", minutes: [30, 60, 30], blocks: ["Redis use cases + Lambda-in-VPC tradeoff", "Cache GET wiki pages (or CloudFront TTL)", "CloudWatch latency comparison"], lab: "Global Ski Atlas frontend — lambda/wiki-api" },
  { night: 24, week: 4, title: "Lab 3B — Athena on Iceberg", minutes: [20, 70, 30], blocks: ["Athena workgroup + Glue catalog", "SQL: resort counts by country", "Athena vs Redshift decision table"], lab: "Global Ski Atlas backend — register_iceberg.py" },
  { night: 25, week: 4, title: "Lab 3C — Route 53 advanced", minutes: [30, 60, 30], blocks: ["Weighted / failover / latency routing", "Health check on witcoskitech.com", "Test subdomain routing lab"], lab: "Cloud Resume Challenge DNS" },
  { night: 26, week: 4, title: "CloudFront + API performance", minutes: [30, 60, 30], blocks: ["Cache behaviors for /api/* paths", "API Gateway throttling", "Build CloudWatch dashboard"], lab: "Global Ski Atlas frontend — wiki-api-production.md" },
  { night: 27, week: 4, title: "EC2 + EBS + Spot", minutes: [40, 50, 30], blocks: ["EBS gp3/io2/st1/sc1 matrix", "Optional: Spot EC2 PMTiles job vs Fargate", "Cost table from AWS_ECS_DEPLOYMENT.md"], lab: "Global Ski Atlas backend — WORLD_SCALE.md" },
  { night: 28, week: 4, title: "Integration services", minutes: [50, 40, 30], blocks: ["EventBridge vs SQS vs Kinesis vs Step Functions", "AppSync awareness", "Draw Night 32 Step Functions capstone"], lab: "Read-only GSA integration audit — night-28-lab-integration-audit.ps1" },
  { night: 29, week: 4, title: "Week 4 review", minutes: [20, 40, 60], blocks: ["Storage class decision tree (S3/EBS/EFS)", "30 practice questions", "Update architecture notes"], lab: undefined },

  { night: 30, week: 5, title: "Lab 4A — S3 lifecycle + cost", minutes: [30, 60, 30], blocks: ["Lifecycle rules on old pipeline prefixes", "Cost Explorer top services", "AWS Budget alert"], lab: "globalskiatlas-backend-k8s-output" },
  { night: 31, week: 5, title: "Lab 4B — Fargate right-sizing", minutes: [40, 50, 30], blocks: ["Compare ecs-task-pipeline-*.json sizes", "Savings Plans vs Spot vs On-Demand", "Compute Optimizer read"], lab: "Global Ski Atlas backend — aws/" },
  { night: 32, week: 5, title: "Lab 4C — Step Functions capstone", minutes: [20, 80, 20], blocks: ["State machine: ECS → SQS → Lambda → SNS", "Error handling + Catch states", "Deploy sam-pipeline-orchestrator"], lab: "Global Ski Atlas backend — new SAM stack" },
  { night: 33, week: 5, title: "Architecture write-up", minutes: [30, 60, 30], blocks: ["Document GSA frontend + backend stacks", "One security/resilience/cost win per tier", "Link labs to Well-Architected pillars"], lab: "Portfolio artifact" },
  { night: 34, week: 5, title: "Practice exam 1", minutes: [10, 130, 20], blocks: ["Timed full mock (130 min)", "Review every wrong answer", "List weak services"], lab: undefined },
  { night: 35, week: 5, title: "Weak-area drill", minutes: [20, 60, 40], blocks: ["Re-study top 3 missed domains", "40 targeted questions", "Redo 5 missed scenarios aloud"], lab: undefined },
  { night: 36, week: 5, title: "Practice exam 2 + schedule", minutes: [10, 130, 20], blocks: ["Second timed mock — target ≥75%", "Schedule real exam if ready", "Tear down NAT/Aurora/ElastiCache labs"], lab: undefined },
];

function LevelBadge({ level }: { level: ServiceRow["level"] }) {
  const colors: Record<ServiceRow["level"], string> = {
    Production: "bg-green-100 text-green-800 border-green-200",
    "Hands-on": "bg-blue-100 text-blue-800 border-blue-200",
    Documented: "bg-amber-100 text-amber-800 border-amber-200",
    "Exam gap": "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${colors[level]}`}>
      {level}
    </span>
  );
}

export default function AwsSolutionsArchitectStudyPage() {
  const quizzes = listQuizSummaries();
  const guides = listGuideSummaries();
  const quizNightRange =
    quizzes.length > 0
      ? quizzes.length === 1
        ? `Night ${quizzes[0].night}`
        : `Nights ${quizzes[0].night}–${quizzes[quizzes.length - 1].night}`
      : null;

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

          <p className="text-sm uppercase tracking-widest text-[#666] mb-2">Certification prep</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#444] mb-4">
            AWS Solutions Architect – Associate (SAA-C03)
          </h1>
          <p className="leading-relaxed mb-2 text-[#555]">
            <strong>Started:</strong> June 2026 · <strong>Pace:</strong> 2 hours every night ·{" "}
            <strong>Duration:</strong> 5 weeks (35 nights, ~70 hours)
          </p>
          <p className="leading-relaxed mb-6">
            I earned{" "}
            <Link href="/cloud-resume-challenge.html" className="text-[#007bff] hover:underline">
              AWS Cloud Practitioner in 2021
            </Link>{" "}
            and have since built production AWS for{" "}
            <a href="https://globalskiatlas.com" className="text-[#007bff] hover:underline">
              Global Ski Atlas
            </a>{" "}
            (frontend + backend) and{" "}
            <a href="https://witcoskitech.com" className="text-[#007bff] hover:underline">
              witcoskitech.com
            </a>
            . This page is my public study log: what I already know from those systems,
            what I don&apos;t, and exactly what I&apos;m doing each night to close the gap.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-10">
            <div className="rounded-lg border border-[#ddd] p-4 bg-[#fafafa]">
              <p className="text-2xl font-bold text-[#444]">30%</p>
              <p className="text-sm text-[#666]">Domain 1 — Secure Architectures</p>
            </div>
            <div className="rounded-lg border border-[#ddd] p-4 bg-[#fafafa]">
              <p className="text-2xl font-bold text-[#444]">26%</p>
              <p className="text-sm text-[#666]">Domain 2 — Resilient Architectures</p>
            </div>
            <div className="rounded-lg border border-[#ddd] p-4 bg-[#fafafa]">
              <p className="text-2xl font-bold text-[#444]">24% + 20%</p>
              <p className="text-sm text-[#666]">High-Performing + Cost-Optimized</p>
            </div>
          </div>

          {(quizzes.length > 0 || guides.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {guides.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#444] mb-1">
                      Study guides
                    </h2>
                    <p className="text-sm text-[#555] leading-relaxed">
                      {guides.length} nightly guides — read before the quiz (
                      <code className="bg-white/80 px-1 rounded text-xs">study-lab/*.md</code>
                      ).
                    </p>
                  </div>
                  <Link
                    href="/aws-solutions-architect-study/guide/"
                    className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
                  >
                    Open guides →
                  </Link>
                </div>
              )}
              {quizzes.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 flex flex-col gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#444] mb-1">
                      Practice quizzes
                    </h2>
                    <p className="text-sm text-[#555] leading-relaxed">
                      {quizNightRange} — timed scenario questions with explanations after submit.
                    </p>
                  </div>
                  <Link
                    href="/aws-solutions-architect-study/quiz/"
                    className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#007bff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0069d9] transition-colors"
                  >
                    Open quizzes →
                  </Link>
                </div>
              )}
            </div>
          )}

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            What I already know
          </h2>
          <p className="leading-relaxed mb-4">
            Scanned across{" "}
            <strong>Global Ski Atlas frontend</strong> (static site, wiki API, Cognito, Bedrock) and{" "}
            <strong>Global Ski Atlas backend</strong> (ECS Fargate pipeline, GeoParquet/Iceberg data lake).
            Strength: modern serverless + containers + NoSQL. Weakness: classic three-tier VPC,
            relational databases, and messaging patterns — exactly where SAA focuses.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-[#666]">
            Repo mapping: frontend → <code className="bg-[#f4f4f4] px-1 rounded">GlobalSkiAtlas_2</code> ·
            backend → <code className="bg-[#f4f4f4] px-1 rounded">globalskiatlas_data</code>.
            Additional labs use{" "}
            <Link href="/cloud-resume-challenge.html" className="text-[#007bff] hover:underline">
              Cloud Resume Challenge
            </Link>{" "}
            where an isolated stack is safer than touching production atlas code.
          </p>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#ddd] bg-[#fafafa]">
                  <th className="text-left p-2 font-semibold">Service</th>
                  <th className="text-left p-2 font-semibold">Level</th>
                  <th className="text-left p-2 font-semibold hidden sm:table-cell">Where</th>
                </tr>
              </thead>
              <tbody>
                {knownServices.map((row) => (
                  <tr key={row.service} className="border-b border-[#eee]">
                    <td className="p-2 align-top font-medium">{row.service}</td>
                    <td className="p-2 align-top">
                      <LevelBadge level={row.level} />
                    </td>
                    <td className="p-2 align-top text-[#666] hidden sm:table-cell">{row.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold text-[#444] mt-8 mb-3">
            Architecture patterns I can explain from experience
          </h3>
          <ul className="list-disc pl-6 mb-6 space-y-2 text-[#444]">
            <li>
              <strong>Frontend — static site:</strong> GitHub Actions → S3 → CloudFront → Route 53
              (globalskiatlas.com)
            </li>
            <li>
              <strong>Frontend — serverless API:</strong> API Gateway → Lambda → DynamoDB (wiki CRUD,
              Iceberg stats, Bedrock chat)
            </li>
            <li>
              <strong>Backend — container batch:</strong> GitHub Actions → ECR → ECS Fargate → S3 GeoParquet
              (continent pipeline)
            </li>
            <li>
              <strong>Backend — data lake:</strong> S3 Parquet → Glue catalog → Iceberg snapshots → stats API
            </li>
            <li>
              <strong>Frontend — auth + AI:</strong> Cognito JWT validation; Bedrock Nova for chat and resort
              copy
            </li>
            <li>
              <strong>Both — IaC + CI/CD:</strong> SAM templates,{" "}
              <code className="bg-[#f4f4f4] px-1 rounded text-xs">sam deploy</code>, GitHub Actions with AWS
              credentials
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-[#444] mt-8 mb-3">
            Priority gaps ({examCounts.study} services marked Study)
          </h3>
          <ul className="list-disc pl-6 mb-8 space-y-1.5 text-[#555]">
            {gapServices.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="text-sm text-[#666] mb-10">
            Full in-scope list: <strong>{examCounts.total} services</strong> ({examCounts.know} know ·{" "}
            {examCounts.partial} partial · {examCounts.study} study · {examCounts.awareness} awareness) — use
            the interactive checklist below to track every one.
          </p>

          <ExamChecklist />

          <h2 className="text-2xl font-bold text-[#444] mt-12 mb-4">
            Nightly structure (every 2-hour block)
          </h2>
          <p className="leading-relaxed mb-4">
            Same rhythm every night so it becomes habit. Adjust minutes if a lab runs long — never skip
            the review block.
          </p>
          <ol className="list-decimal pl-6 mb-8 space-y-3">
            <li>
              <strong>Learn (20–40 min)</strong> — Read official exam guide task statements, AWS docs, or
              Skill Builder for that night&apos;s topic.
            </li>
            <li>
              <strong>Build (60–80 min)</strong> — Hands-on lab on my repos or account-level security
              setup. Ship something, don&apos;t just watch videos.
            </li>
            <li>
              <strong>Retain (20–30 min)</strong> — Check off services from this week&apos;s exam categories;
              practice questions; flashcards. Format: <em>Scenario → best service → why not the others</em>.
            </li>
          </ol>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            5-week nightly calendar
          </h2>
          <p className="leading-relaxed mb-6 text-sm text-[#666]">
            Week 1 Security · Week 2 VPC + messaging · Week 3 RDS + resilience · Week 4 Performance ·
            Week 5 Cost + mocks
          </p>

          <div className="space-y-4 mb-10">
            {[1, 2, 3, 4, 5].map((week) => (
              <div key={week}>
                <h3 className="text-lg font-semibold text-[#444] mb-2 pb-1 border-b border-[#eee]">
                  Week {week}
                </h3>
                <ul className="space-y-3">
                  {nightlyPlan
                    .filter((n) => n.week === week)
                    .map((n) => (
                      <li
                        key={n.night}
                        className="rounded-lg border border-[#e5e5e5] p-3 bg-[#fafafa]"
                      >
                        <p className="font-medium text-[#333]">
                          Night {n.night}: {n.title}
                        </p>
                        <p className="text-xs text-[#888] mt-0.5 mb-2">
                          {n.minutes[0]}m learn · {n.minutes[1]}m build · {n.minutes[2]}m retain
                        </p>
                        <ul className="text-sm text-[#555] list-disc pl-4 space-y-0.5">
                          {n.blocks.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                        {n.lab && (
                          <p className="text-xs mt-2 text-[#007bff]">
                            Lab repo: {n.lab}
                          </p>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            Labs and code map
          </h2>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#ddd] bg-[#fafafa]">
                  <th className="text-left p-2 font-semibold">Lab</th>
                  <th className="text-left p-2 font-semibold">System</th>
                  <th className="text-left p-2 font-semibold hidden md:table-cell">Key paths</th>
                </tr>
              </thead>
              <tbody className="text-[#555]">
                <tr className="border-b border-[#eee]">
                  <td className="p-2">WAF, Cognito, wiki cache, CloudFront tuning</td>
                  <td className="p-2">Global Ski Atlas frontend</td>
                  <td className="p-2 hidden md:table-cell"><code className="text-xs">template.yaml</code>, lambda/wiki-api/</td>
                </tr>
                <tr className="border-b border-[#eee]">
                  <td className="p-2">VPC, ECS, SQS, Athena, lifecycle, Step Functions</td>
                  <td className="p-2">Global Ski Atlas backend</td>
                  <td className="p-2 hidden md:table-cell"><code className="text-xs">aws/</code>, docs/AWS_ECS_DEPLOYMENT.md</td>
                </tr>
                <tr className="border-b border-[#eee]">
                  <td className="p-2">KMS, Aurora study stack, Route 53 labs</td>
                  <td className="p-2">Cloud Resume Challenge (witcoskitech.com)</td>
                  <td className="p-2 hidden md:table-cell"><code className="text-xs">template.yml</code>, rds-study/ (new)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            Resources
          </h2>
          <ul className="list-disc pl-6 mb-8 space-y-2">
            <li>
              <a
                href="https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                Official SAA-C03 exam guide
              </a>
            </li>
            <li>
              <a
                href="https://skillbuilder.aws/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline"
              >
                AWS Skill Builder
              </a>{" "}
              — Exam Prep: Solutions Architect Associate
            </li>
            <li>
              Practice exams (Week 5, Nights 33 & 35) — Tutorials Dojo or Stephane Maarek on Udemy
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-[#444] mt-10 mb-4">
            Tear-down reminder
          </h2>
          <p className="leading-relaxed mb-4 text-sm text-[#666]">
            After labs, delete NAT Gateways, Aurora clusters, ElastiCache nodes, and idle EC2 to avoid
            ongoing charges. Keep Budget alerts, lifecycle rules, and WAF — those save money or harden
            prod.
          </p>

          <p className="leading-relaxed text-sm text-[#888] border-t border-[#eee] pt-6 mt-8">
            Last updated June 2026. I&apos;ll revise this page as I complete each week.
          </p>
        </div>
      </div>
    </main>
  );
}
