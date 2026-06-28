/** SAA-C03 in-scope services — aligned with the official exam guide (June 2026). */

export type ExamReadiness = "know" | "partial" | "study" | "awareness";

export type ExamService = {
  id: string;
  name: string;
  category: string;
  readiness: ExamReadiness;
  domain: string;
  examFocus: string;
  gsaNote?: string;
  studyWeek?: number;
};

export type DomainTask = {
  id: string;
  domain: number;
  domainLabel: string;
  task: string;
  weight: string;
  checkpoints: string[];
};

export type StudyNight = {
  night: number;
  week: number;
  title: string;
  completedDate: string;
  lab?: string;
  practiceScore?: string;
  notes?: string;
  /** Service ids reviewed that night (checklist rows). */
  reviewedServiceIds: string[];
  /** Domain checkpoint ids completed, e.g. d1-t1-cp-0. */
  completedCheckpointIds: string[];
};

export const readinessLegend: Record<
  ExamReadiness,
  { label: string; description: string }
> = {
  know: {
    label: "Know",
    description: "Used in production (Global Ski Atlas frontend/backend or witcoskitech.com)",
  },
  partial: {
    label: "Partial",
    description: "Touched in docs or basic config — need exam-depth review",
  },
  study: {
    label: "Study",
    description: "High exam weight, not yet hands-on — priority lab or deep read",
  },
  awareness: {
    label: "Awareness",
    description: "In scope — know when to pick it vs alternatives; lower question frequency",
  },
};

export const examServices: ExamService[] = [
  // Analytics
  { id: "athena", name: "Amazon Athena", category: "Analytics", readiness: "partial", domain: "D3", examFocus: "Serverless SQL on S3/Glue catalog; partition for cost", gsaNote: "Iceberg registered — query via Athena in Week 4 lab", studyWeek: 4 },
  { id: "data-exchange", name: "AWS Data Exchange", category: "Analytics", readiness: "awareness", domain: "D3", examFocus: "Subscribe to third-party datasets in AWS" },
  { id: "firehose", name: "Amazon Data Firehose", category: "Analytics", readiness: "study", domain: "D3", examFocus: "Near-real-time delivery to S3/Redshift/OpenSearch; no custom code", studyWeek: 4 },
  { id: "emr", name: "Amazon EMR", category: "Analytics", readiness: "awareness", domain: "D3", examFocus: "Managed Hadoop/Spark clusters; big batch vs serverless Athena" },
  { id: "glue", name: "AWS Glue", category: "Analytics", readiness: "partial", domain: "D3", examFocus: "ETL jobs + Data Catalog; crawlers vs PyIceberg registration", gsaNote: "Catalog for Iceberg tables", studyWeek: 4 },
  { id: "kinesis", name: "Amazon Kinesis", category: "Analytics", readiness: "study", domain: "D3", examFocus: "Data Streams (custom consumers) vs Firehose (managed delivery)", studyWeek: 4 },
  { id: "lake-formation", name: "AWS Lake Formation", category: "Analytics", readiness: "awareness", domain: "D1/D3", examFocus: "Fine-grained permissions on data lake; central governance" },
  { id: "msk", name: "Amazon MSK", category: "Analytics", readiness: "awareness", domain: "D3", examFocus: "Managed Kafka; streaming ingest at scale" },
  { id: "opensearch", name: "Amazon OpenSearch Service", category: "Analytics", readiness: "study", domain: "D3", examFocus: "Log analytics + full-text search; Kinesis/Firehose destination", studyWeek: 4 },
  { id: "quick", name: "Amazon Quick", category: "Analytics", readiness: "awareness", domain: "D3", examFocus: "BI dashboards on AWS data" },
  { id: "redshift", name: "Amazon Redshift", category: "Analytics", readiness: "study", domain: "D3/D4", examFocus: "Data warehouse; RA3; Redshift Serverless; vs Athena for ad hoc", studyWeek: 3 },

  // Application Integration
  { id: "appflow", name: "Amazon AppFlow", category: "Application Integration", readiness: "awareness", domain: "D3", examFocus: "SaaS ↔ AWS data transfer without code" },
  { id: "appsync", name: "AWS AppSync", category: "Application Integration", readiness: "awareness", domain: "D3", examFocus: "GraphQL API; real-time subscriptions" },
  { id: "eventbridge", name: "Amazon EventBridge", category: "Application Integration", readiness: "know", domain: "D2", examFocus: "Event bus; schedule rules; decouple microservices", gsaNote: "Night 12: saa-study-gsa-iceland-monthly cron → ecs:RunTask; events.amazonaws.com target role + PassRole", studyWeek: 2 },
  { id: "mq", name: "Amazon MQ", category: "Application Integration", readiness: "awareness", domain: "D2", examFocus: "Managed ActiveMQ/RabbitMQ; lift-and-shift messaging" },
  { id: "sns", name: "Amazon SNS", category: "Application Integration", readiness: "know", domain: "D2", examFocus: "Pub/sub fan-out; SMS/email/mobile push; SNS → SQS pattern", gsaNote: "Night 14: saa-study-gsa-iceland-alerts topic; failure rule → SNS; inbox SQS sub; Night 12 alarm action", studyWeek: 2 },
  { id: "sqs", name: "Amazon SQS", category: "Application Integration", readiness: "study", domain: "D2", examFocus: "Queue decoupling; standard vs FIFO; DLQ; visibility timeout", studyWeek: 2 },
  { id: "step-functions", name: "AWS Step Functions", category: "Application Integration", readiness: "study", domain: "D2", examFocus: "Orchestrate Lambda/ECS; Standard vs Express; error handling", studyWeek: 5 },

  // Cost Management
  { id: "budgets", name: "AWS Budgets", category: "Cost Management", readiness: "study", domain: "D4", examFocus: "Alerts on spend; forecast notifications", studyWeek: 5 },
  { id: "cur", name: "AWS Cost and Usage Report", category: "Cost Management", readiness: "awareness", domain: "D4", examFocus: "Detailed billing export to S3 for analysis" },
  { id: "cost-explorer", name: "AWS Cost Explorer", category: "Cost Management", readiness: "study", domain: "D4", examFocus: "Visualize spend; RI/SP recommendations", studyWeek: 5 },
  { id: "savings-plans", name: "Savings Plans", category: "Cost Management", readiness: "study", domain: "D4", examFocus: "Commit $/hr for compute; broader than RI", studyWeek: 5 },

  // Compute
  { id: "batch", name: "AWS Batch", category: "Compute", readiness: "partial", domain: "D3/D4", examFocus: "Batch jobs on EC2/Spot/Fargate; vs ECS for long pipelines", gsaNote: "Mentioned for PMTiles builds", studyWeek: 4 },
  { id: "ec2", name: "Amazon EC2", category: "Compute", readiness: "study", domain: "D2/D3/D4", examFocus: "Instance families; placement groups; hibernation; Spot vs On-Demand", studyWeek: 4 },
  { id: "ec2-asg", name: "Amazon EC2 Auto Scaling", category: "Compute", readiness: "study", domain: "D2/D4", examFocus: "Scale on metrics; launch templates; health checks with ELB", studyWeek: 4 },
  { id: "beanstalk", name: "AWS Elastic Beanstalk", category: "Compute", readiness: "awareness", domain: "D3", examFocus: "PaaS deploy; less control than EC2/ECS" },
  { id: "outposts", name: "AWS Outposts", category: "Compute", readiness: "awareness", domain: "D4", examFocus: "AWS hardware on-premises; hybrid" },
  { id: "sar", name: "AWS Serverless Application Repository", category: "Compute", readiness: "awareness", domain: "D3", examFocus: "Share/deploy serverless apps" },
  { id: "vmware", name: "VMware Cloud on AWS", category: "Compute", readiness: "awareness", domain: "D4", examFocus: "VMware workloads on bare metal" },
  { id: "wavelength", name: "AWS Wavelength", category: "Compute", readiness: "awareness", domain: "D3", examFocus: "5G edge compute at carrier sites" },

  // Containers
  { id: "ecr", name: "Amazon ECR", category: "Containers", readiness: "know", domain: "D3", examFocus: "Private Docker registry; image scanning", gsaNote: "Night 1: deploy user push scoped to globalskiatlas-backend-k8s-pipeline" },
  { id: "ecs", name: "Amazon ECS", category: "Containers", readiness: "know", domain: "D2/D3", examFocus: "Task definitions; services; Fargate vs EC2 launch", gsaNote: "Night 1 audit: execution role (ECR/logs) vs task role (S3)" },
  { id: "ecs-anywhere", name: "Amazon ECS Anywhere", category: "Containers", readiness: "awareness", domain: "D3", examFocus: "Run ECS tasks on your own hardware" },
  { id: "eks", name: "Amazon EKS", category: "Containers", readiness: "study", domain: "D2/D3", examFocus: "Managed Kubernetes; vs ECS when K8s required", studyWeek: 4 },
  { id: "eks-anywhere", name: "Amazon EKS Anywhere", category: "Containers", readiness: "awareness", domain: "D3", examFocus: "K8s on-premises" },
  { id: "eks-distro", name: "Amazon EKS Distro", category: "Containers", readiness: "awareness", domain: "D3", examFocus: "Open-source K8s distribution" },
  { id: "fargate", name: "AWS Fargate", category: "Containers", readiness: "know", domain: "D3/D4", examFocus: "Serverless containers; no EC2 to manage; per-task billing", gsaNote: "Night 1: CannotPullContainerError → execution role, not task role (Q3)" },

  // Database
  { id: "aurora", name: "Amazon Aurora", category: "Database", readiness: "study", domain: "D2/D3/D4", examFocus: "MySQL/PostgreSQL compatible; storage auto-scales; Global Database", studyWeek: 3 },
  { id: "aurora-serverless", name: "Amazon Aurora Serverless", category: "Database", readiness: "study", domain: "D4", examFocus: "Scale ACUs to zero; intermittent workloads", studyWeek: 3 },
  { id: "documentdb", name: "Amazon DocumentDB", category: "Database", readiness: "awareness", domain: "D3", examFocus: "MongoDB-compatible; document model" },
  { id: "dynamodb", name: "Amazon DynamoDB", category: "Database", readiness: "know", domain: "D2/D3/D4", examFocus: "Partition key design; on-demand vs provisioned; DAX; global tables", gsaNote: "Frontend wiki tables" },
  { id: "elasticache", name: "Amazon ElastiCache", category: "Database", readiness: "study", domain: "D3/D4", examFocus: "Redis vs Memcached; session/cache; reduce DB load", studyWeek: 4 },
  { id: "keyspaces", name: "Amazon Keyspaces", category: "Database", readiness: "awareness", domain: "D3", examFocus: "Managed Cassandra-compatible" },
  { id: "neptune", name: "Amazon Neptune", category: "Database", readiness: "awareness", domain: "D3", examFocus: "Graph DB; relationships/social/fraud" },
  { id: "rds", name: "Amazon RDS", category: "Database", readiness: "study", domain: "D2/D3/D4", examFocus: "Multi-AZ; read replicas; automated backups; engine choice", studyWeek: 3 },
  { id: "rds-proxy", name: "Amazon RDS Proxy", category: "Database", readiness: "study", domain: "D3", examFocus: "Connection pooling for Lambda/serverless → RDS", studyWeek: 3 },

  // Developer Tools
  { id: "x-ray", name: "AWS X-Ray", category: "Developer Tools", readiness: "study", domain: "D3", examFocus: "Distributed tracing; map latency across services", studyWeek: 4 },

  // Front-End Web and Mobile
  { id: "amplify", name: "AWS Amplify", category: "Front-End Web and Mobile", readiness: "awareness", domain: "D3", examFocus: "Full-stack mobile/web; auth + hosting + API" },
  { id: "api-gateway", name: "Amazon API Gateway", category: "Front-End Web and Mobile", readiness: "know", domain: "D2/D3", examFocus: "REST vs HTTP vs WebSocket; throttling; caching; authorizers", gsaNote: "Frontend SAM APIs" },
  { id: "device-farm", name: "AWS Device Farm", category: "Front-End Web and Mobile", readiness: "awareness", domain: "D3", examFocus: "Test mobile apps on real devices" },

  // Machine Learning (in scope — awareness level for most)
  { id: "comprehend", name: "Amazon Comprehend", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "NLP; sentiment/entities from text" },
  { id: "kendra", name: "Amazon Kendra", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "Enterprise search with ML" },
  { id: "lex", name: "Amazon Lex", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "Chatbots; connects to Lambda" },
  { id: "polly", name: "Amazon Polly", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "Text-to-speech" },
  { id: "rekognition", name: "Amazon Rekognition", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "Image/video analysis" },
  { id: "sagemaker", name: "Amazon SageMaker AI", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "Train/deploy ML models; vs Bedrock for foundation models" },
  { id: "textract", name: "Amazon Textract", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "Extract text from documents/forms" },
  { id: "transcribe", name: "Amazon Transcribe", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "Speech-to-text" },
  { id: "translate", name: "Amazon Translate", category: "Machine Learning", readiness: "awareness", domain: "D3", examFocus: "Real-time language translation" },

  // Management and Governance
  { id: "auto-scaling", name: "AWS Auto Scaling", category: "Management and Governance", readiness: "study", domain: "D2/D4", examFocus: "Unified scaling for multiple resources", studyWeek: 4 },
  { id: "cli", name: "AWS CLI", category: "Management and Governance", readiness: "know", domain: "D1", examFocus: "Scripting AWS operations", gsaNote: "Night 1 lab: get-policy-version, simulate-principal-policy, list-role-policies" },
  { id: "cloudformation", name: "AWS CloudFormation", category: "Management and Governance", readiness: "know", domain: "D2", examFocus: "IaC stacks; drift; nested stacks; StackSets", gsaNote: "SAM generates CFN" },
  { id: "cloudtrail", name: "AWS CloudTrail", category: "Management and Governance", readiness: "partial", domain: "D1", examFocus: "API audit log; org trail; vs Config for compliance state", gsaNote: "Night 5: saa-study-account-trail multi-region → saa-study-cloudtrail-298043721974; log file validation on", studyWeek: 1 },
  { id: "cloudwatch", name: "Amazon CloudWatch", category: "Management and Governance", readiness: "partial", domain: "D2/D3", examFocus: "Metrics, alarms, logs, dashboards, EventBridge integration", gsaNote: "ECS logs + Night 12 FailedInvocations alarm on EventBridge rule", studyWeek: 2 },
  { id: "compute-optimizer", name: "AWS Compute Optimizer", category: "Management and Governance", readiness: "study", domain: "D4", examFocus: "Right-size EC2/EBS/Lambda recommendations", studyWeek: 5 },
  { id: "config", name: "AWS Config", category: "Management and Governance", readiness: "partial", domain: "D1", examFocus: "Resource configuration history; rules; compliance", gsaNote: "Night 5: saa-study-recorder + S3_BUCKET_PUBLIC_READ_PROHIBITED + IAM_USER_MFA_ENABLED rules", studyWeek: 1 },
  { id: "control-tower", name: "AWS Control Tower", category: "Management and Governance", readiness: "awareness", domain: "D1", examFocus: "Multi-account landing zone; guardrails" },
  { id: "health", name: "AWS Health Dashboard", category: "Management and Governance", readiness: "awareness", domain: "D2", examFocus: "AWS service events affecting your account" },
  { id: "license-manager", name: "AWS License Manager", category: "Management and Governance", readiness: "awareness", domain: "D4", examFocus: "Track software licenses on AWS" },
  { id: "organizations", name: "AWS Organizations", category: "Management and Governance", readiness: "partial", domain: "D1", examFocus: "Multi-account; SCPs; consolidated billing", gsaNote: "Night 1: SCP Deny beats IAM Allow — even admins (Q1, B1)", studyWeek: 1 },
  { id: "service-catalog", name: "AWS Service Catalog", category: "Management and Governance", readiness: "awareness", domain: "D1", examFocus: "Approved products for self-service provisioning" },
  { id: "ssm", name: "AWS Systems Manager", category: "Management and Governance", readiness: "partial", domain: "D1", examFocus: "Parameter Store vs Secrets Manager; Patch Manager; Session Manager", gsaNote: "Night 3: SecureString /saa-study/gsa-wiki-cognito contrast; Session Manager replaces bastion (Q9)", studyWeek: 1 },
  { id: "trusted-advisor", name: "AWS Trusted Advisor", category: "Management and Governance", readiness: "study", domain: "D4", examFocus: "Cost/security/fault tolerance checks", studyWeek: 5 },
  { id: "well-architected", name: "AWS Well-Architected Tool", category: "Management and Governance", readiness: "awareness", domain: "All", examFocus: "Six pillars review framework" },

  // Media Services
  { id: "elastic-transcoder", name: "Amazon Elastic Transcoder", category: "Media Services", readiness: "awareness", domain: "D3", examFocus: "Convert media file formats" },
  { id: "kinesis-video", name: "Amazon Kinesis Video Streams", category: "Media Services", readiness: "awareness", domain: "D3", examFocus: "Ingest video streams for analytics/ML" },

  // Migration and Transfer
  { id: "mgn", name: "AWS Application Migration Service", category: "Migration and Transfer", readiness: "awareness", domain: "D2", examFocus: "Lift-and-shift servers to AWS (rehost)" },
  { id: "datasync", name: "AWS DataSync", category: "Migration and Transfer", readiness: "study", domain: "D4", examFocus: "Online data transfer on-premises ↔ AWS; vs Snow for offline", studyWeek: 5 },
  { id: "dms", name: "AWS DMS", category: "Migration and Transfer", readiness: "study", domain: "D3/D4", examFocus: "Database migration; homogeneous vs heterogeneous; CDC", studyWeek: 3 },
  { id: "snow", name: "AWS Snow Family", category: "Migration and Transfer", readiness: "study", domain: "D4", examFocus: "Snowcone/Snowball/Snowmobile for offline petabyte transfer", studyWeek: 5 },
  { id: "transfer-family", name: "AWS Transfer Family", category: "Migration and Transfer", readiness: "awareness", domain: "D4", examFocus: "Managed SFTP/FTP/FTPS to S3" },

  // Networking and Content Delivery
  { id: "client-vpn", name: "AWS Client VPN", category: "Networking and Content Delivery", readiness: "study", domain: "D1", examFocus: "Remote users → VPC; vs Site-to-Site for offices", studyWeek: 3 },
  { id: "cloudfront", name: "Amazon CloudFront", category: "Networking and Content Delivery", readiness: "know", domain: "D3/D4", examFocus: "CDN; OAC; cache behaviors; signed URLs; edge functions", gsaNote: "Night 4: WAF Web ACL attach on E3BDMTLYF8G4VB (api/wiki* POST); torn down after lab" },
  { id: "direct-connect", name: "AWS Direct Connect", category: "Networking and Content Delivery", readiness: "study", domain: "D2/D4", examFocus: "Dedicated private link to AWS; vs VPN over internet", studyWeek: 3 },
  { id: "elb", name: "Elastic Load Balancing (ELB)", category: "Networking and Content Delivery", readiness: "study", domain: "D2/D3", examFocus: "ALB (L7) vs NLB (L4/TCP/UDP) vs GWLB (firewall)", studyWeek: 2 },
  { id: "global-accelerator", name: "AWS Global Accelerator", category: "Networking and Content Delivery", readiness: "study", domain: "D3/D4", examFocus: "Static anycast IPs; TCP/UDP; vs CloudFront for HTTP cache", studyWeek: 4 },
  { id: "privatelink", name: "AWS PrivateLink", category: "Networking and Content Delivery", readiness: "study", domain: "D1/D4", examFocus: "Private access to AWS services/other VPCs; no internet/NAT", studyWeek: 3 },
  { id: "route53", name: "Amazon Route 53", category: "Networking and Content Delivery", readiness: "partial", domain: "D2/D3", examFocus: "Routing policies; health checks; alias records; failover", gsaNote: "Basic DNS only", studyWeek: 4 },
  { id: "site-to-site-vpn", name: "AWS Site-to-Site VPN", category: "Networking and Content Delivery", readiness: "study", domain: "D2", examFocus: "IPsec tunnel on-premises ↔ VPC; quick/cheap vs DX", studyWeek: 3 },
  { id: "transit-gateway", name: "AWS Transit Gateway", category: "Networking and Content Delivery", readiness: "study", domain: "D2/D4", examFocus: "Hub for VPC/VPN/DX; vs full mesh peering", studyWeek: 3 },
  { id: "vpc", name: "Amazon VPC", category: "Networking and Content Delivery", readiness: "partial", domain: "D1/D2", examFocus: "Subnets, IGW, NAT GW, NACL vs SG, VPC endpoints, peering", gsaNote: "Night 1: SG stateful at ENI vs NACL stateless at subnet (Q5)", studyWeek: 2 },

  // Security, Identity, and Compliance
  { id: "artifact", name: "AWS Artifact", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Download compliance reports (SOC, PCI)" },
  { id: "audit-manager", name: "AWS Audit Manager", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Continuous compliance audits" },
  { id: "acm", name: "AWS Certificate Manager (ACM)", category: "Security, Identity, and Compliance", readiness: "partial", domain: "D1", examFocus: "Free public TLS certs; must use us-east-1 for CloudFront", gsaNote: "CloudFront HTTPS", studyWeek: 1 },
  { id: "cloudhsm", name: "AWS CloudHSM", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Dedicated hardware HSM; vs KMS shared" },
  { id: "cognito", name: "Amazon Cognito", category: "Security, Identity, and Compliance", readiness: "know", domain: "D1", examFocus: "User pools vs identity pools; OAuth/OIDC; federated sign-in", gsaNote: "Night 3: wiki pool us-east-1_Ggqkiudld config in Secrets Manager saa-study/gsa-wiki-cognito", },
  { id: "detective", name: "Amazon Detective", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Investigate security findings root cause" },
  { id: "directory-service", name: "AWS Directory Service", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Managed Microsoft AD / Simple AD" },
  { id: "firewall-manager", name: "AWS Firewall Manager", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Central WAF/rule management across accounts", gsaNote: "Night 4 Q8: org-wide WAF policy — not a Security Group replacement" },
  { id: "guardduty", name: "Amazon GuardDuty", category: "Security, Identity, and Compliance", readiness: "study", domain: "D1", examFocus: "Threat detection from CloudTrail/VPC/ DNS logs", gsaNote: "Night 5: needs CloudTrail (now on); threat detection not compliance state — that's Config (Q2)", studyWeek: 1 },
  { id: "iam-identity-center", name: "AWS IAM Identity Center", category: "Security, Identity, and Compliance", readiness: "partial", domain: "D1", examFocus: "SSO to AWS accounts and SaaS; successor to AWS SSO", gsaNote: "Night 1: multi-account SSO — not RAM (Q4)", studyWeek: 1 },
  { id: "inspector", name: "Amazon Inspector", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Automated vulnerability scanning for EC2/containers" },
  { id: "kms", name: "AWS KMS", category: "Security, Identity, and Compliance", readiness: "partial", domain: "D1", examFocus: "CMK; envelope encryption; key policies vs IAM; SSE-KMS", gsaNote: "Night 2: CMK alias/saa-study-witcoskitech; key policy root stmt; SSE-KMS lab prefix; kms:Decrypt + s3:GetObject both required", studyWeek: 1 },
  { id: "macie", name: "Amazon Macie", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Discover/classify sensitive data in S3" },
  { id: "network-firewall", name: "AWS Network Firewall", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Stateful VPC traffic filtering", gsaNote: "Night 4 Q5: VPC subnet east-west filtering — not CloudFront/WAF" },
  { id: "ram", name: "AWS Resource Access Manager (RAM)", category: "Security, Identity, and Compliance", readiness: "partial", domain: "D1", examFocus: "Share subnets/transit gateway across accounts", gsaNote: "Night 1: share TGW across accounts — not SSO (B2)" },
  { id: "secrets-manager", name: "AWS Secrets Manager", category: "Security, Identity, and Compliance", readiness: "partial", domain: "D1", examFocus: "Rotation; vs Parameter Store SecureString", gsaNote: "Night 3: saa-study/gsa-wiki-cognito; WikiCognitoSecretRead scoped GetSecretValue + kms:Decrypt; KMS stores keys not passwords (Q6)", studyWeek: 1 },
  { id: "security-hub", name: "AWS Security Hub", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Aggregate findings from GuardDuty, Inspector, etc." },
  { id: "shield", name: "AWS Shield", category: "Security, Identity, and Compliance", readiness: "partial", domain: "D1", examFocus: "Standard (free, L3/L4) vs Advanced (DDoS cost protection + WAF)", gsaNote: "Night 4: Standard free on CloudFront; pair with WAF for L7 SQLi (Q10)", studyWeek: 1 },
  { id: "waf", name: "AWS WAF", category: "Security, Identity, and Compliance", readiness: "partial", domain: "D1", examFocus: "Web ACLs; rate limiting; attach to CloudFront/ALB/API GW", gsaNote: "Night 4: saa-study-globalskiatlas-waf lab; us-east-1 CLOUDFRONT scope; ALB=REGIONAL (Q2/Q4); torn down (~$96/yr)", studyWeek: 1 },
  { id: "iam", name: "IAM", category: "Security, Identity, and Compliance", readiness: "know", domain: "D1", examFocus: "Policies, roles, MFA, boundary, SCP, least privilege", gsaNote: "Night 5: GitHubActionsGlobalskiatlas v4 — scoped Iceland ecs:RunTask ARN; Access Analyzer validate-policy clean", studyWeek: 1 },

  // Serverless
  { id: "lambda", name: "AWS Lambda", category: "Serverless", readiness: "know", domain: "D2/D3", examFocus: "Concurrency, DLQ, VPC cold start, provisioned concurrency", gsaNote: "Night 3: sam-app-WikiApiFunction COGNITO_SECRET_ARN env; code still reads legacy COGNITO_* vars" },

  // Storage
  { id: "backup", name: "AWS Backup", category: "Storage", readiness: "study", domain: "D2/D4", examFocus: "Centralized backup for RDS, EBS, DynamoDB, etc.", studyWeek: 3 },
  { id: "ebs", name: "Amazon EBS", category: "Storage", readiness: "study", domain: "D3/D4", examFocus: "gp3/io2/st1/sc1; snapshots; Multi-Attach io2", studyWeek: 4 },
  { id: "efs", name: "Amazon EFS", category: "Storage", readiness: "study", domain: "D3/D4", examFocus: "Shared NFS; scales with EC2/Lambda; vs EBS block", studyWeek: 4 },
  { id: "fsx", name: "Amazon FSx", category: "Storage", readiness: "awareness", domain: "D4", examFocus: "Windows/Lustre/NetApp/ONTAP file systems" },
  { id: "s3", name: "Amazon S3", category: "Storage", readiness: "know", domain: "D3/D4", examFocus: "Storage classes; lifecycle; versioning; replication; OAC", gsaNote: "Night 2: bucket default SSE-S3 (AES256); per-upload SSE-KMS on study-lab/kms-test/; BucketKey enabled" },
  { id: "glacier", name: "Amazon S3 Glacier", category: "Storage", readiness: "study", domain: "D4", examFocus: "Archive tiers; retrieval times; Glacier Deep Archive", studyWeek: 5 },
  { id: "storage-gateway", name: "AWS Storage Gateway", category: "Storage", readiness: "awareness", domain: "D4", examFocus: "Hybrid on-premises cache backed by S3" },
];

export const domainTasks: DomainTask[] = [
  {
    id: "d1-t1",
    domain: 1,
    domainLabel: "Design Secure Architectures",
    weight: "30%",
    task: "Task 1.1 — Secure access to AWS resources",
    checkpoints: [
      "IAM users vs roles vs groups; permission boundaries",
      "Resource-based vs identity-based policies",
      "MFA; root account protection",
      "Cross-account access (STS, roles, RAM)",
      "Federation: Cognito, IAM Identity Center, SAML/OIDC",
    ],
  },
  {
    id: "d1-t2",
    domain: 1,
    domainLabel: "Design Secure Architectures",
    weight: "30%",
    task: "Task 1.2 — Secure workloads and applications",
    checkpoints: [
      "Encryption at rest: KMS, SSE-S3, SSE-KMS, EBS encryption",
      "Encryption in transit: TLS, ACM certs",
      "Secrets Manager vs SSM Parameter Store",
      "WAF, Shield, Network Firewall placement",
      "Security groups vs NACLs; bastion vs SSM Session Manager",
    ],
  },
  {
    id: "d1-t3",
    domain: 1,
    domainLabel: "Design Secure Architectures",
    weight: "30%",
    task: "Task 1.3 — Determine appropriate data security controls",
    checkpoints: [
      "S3 bucket policies, Block Public Access, OAC/OAI",
      "Data classification; Macie for S3",
      "DynamoDB encryption; RDS encryption",
      "Cross-region replication for compliance",
      "Backup encryption and access logging (CloudTrail)",
    ],
  },
  {
    id: "d2-t1",
    domain: 2,
    domainLabel: "Design Resilient Architectures",
    weight: "26%",
    task: "Task 2.1 — Scalable and loosely coupled architectures",
    checkpoints: [
      "Multi-AZ and multi-Region strategies",
      "SQS/SNS/EventBridge decoupling",
      "Auto Scaling groups; ECS service scaling",
      "Stateless vs stateful tier design",
      "DynamoDB on-demand vs provisioned scaling",
    ],
  },
  {
    id: "d2-t2",
    domain: 2,
    domainLabel: "Design Resilient Architectures",
    weight: "26%",
    task: "Task 2.2 — Highly available and/or fault-tolerant architectures",
    checkpoints: [
      "ELB health checks; Route 53 failover/weighted routing",
      "RDS Multi-AZ vs read replicas vs Aurora",
      "RTO/RPO; pilot light, warm standby, active-active",
      "AWS Backup; snapshot strategies",
      "Single point of failure analysis",
    ],
  },
  {
    id: "d3-t1",
    domain: 3,
    domainLabel: "Design High-Performing Architectures",
    weight: "24%",
    task: "Task 3.1 — Performant storage solutions",
    checkpoints: [
      "S3 performance: prefix partitioning, Transfer Acceleration",
      "EBS volume type selection; EFS throughput modes",
      "FSx for HPC/large file workloads",
      "Caching with CloudFront and ElastiCache",
      "S3 Select / Glacier retrieval tiers",
    ],
  },
  {
    id: "d3-t2",
    domain: 3,
    domainLabel: "Design High-Performing Architectures",
    weight: "24%",
    task: "Task 3.2 — Performant compute solutions",
    checkpoints: [
      "EC2 instance families (compute/memory/storage optimized)",
      "Lambda memory vs CPU; provisioned concurrency",
      "ECS/Fargate task sizing",
      "Placement groups (cluster, spread, partition)",
      "Edge: CloudFront, Global Accelerator, Lambda@Edge awareness",
    ],
  },
  {
    id: "d3-t3",
    domain: 3,
    domainLabel: "Design High-Performing Architectures",
    weight: "24%",
    task: "Task 3.3 — Performant database solutions",
    checkpoints: [
      "DynamoDB partition key design; GSI/LSI",
      "RDS/Aurora read replicas; Aurora replicas lag",
      "ElastiCache/DAX for read-heavy",
      "Redshift for analytics warehouse",
      "Neptune/OpenSearch specialized engines",
    ],
  },
  {
    id: "d3-t4",
    domain: 3,
    domainLabel: "Design High-Performing Architectures",
    weight: "24%",
    task: "Task 3.4 — Performant network architectures",
    checkpoints: [
      "CloudFront vs Global Accelerator vs Route 53 latency routing",
      "Direct Connect + VPN backup",
      "Transit Gateway hub-spoke",
      "VPC endpoints (Gateway vs Interface) to reduce NAT cost",
      "API Gateway caching and throttling",
    ],
  },
  {
    id: "d3-t5",
    domain: 3,
    domainLabel: "Design High-Performing Architectures",
    weight: "24%",
    task: "Task 3.5 — Performant data ingestion and transformation",
    checkpoints: [
      "Kinesis vs Firehose vs MSK",
      "Glue ETL vs Lambda vs EMR",
      "Athena for ad hoc SQL on S3",
      "Lake Formation permissions",
      "DataSync/Snow for bulk transfer",
    ],
  },
  {
    id: "d4-t1",
    domain: 4,
    domainLabel: "Design Cost-Optimized Architectures",
    weight: "20%",
    task: "Task 4.1 — Cost-optimized storage",
    checkpoints: [
      "S3 storage classes and Intelligent-Tiering",
      "Lifecycle policies; Glacier tiers",
      "EBS gp3 right-sizing; snapshot costs",
      "Data transfer pricing awareness",
      "Requester Pays; batch vs individual S3 uploads",
    ],
  },
  {
    id: "d4-t2",
    domain: 4,
    domainLabel: "Design Cost-Optimized Architectures",
    weight: "20%",
    task: "Task 4.2 — Cost-optimized compute",
    checkpoints: [
      "Spot vs On-Demand vs Savings Plans vs Reserved",
      "Lambda vs Fargate vs EC2 cost tradeoffs",
      "Auto Scaling to match demand",
      "Right-sizing with Compute Optimizer",
      "Dev/test off-hours shutdown",
    ],
  },
  {
    id: "d4-t3",
    domain: 4,
    domainLabel: "Design Cost-Optimized Architectures",
    weight: "20%",
    task: "Task 4.3 — Cost-optimized databases",
    checkpoints: [
      "DynamoDB on-demand vs provisioned + auto scaling",
      "Aurora Serverless for spiky workloads",
      "RDS instance sizing; stop/start dev DBs",
      "ElastiCache to reduce RDS read load",
      "DMS for migration cost vs rewrite",
    ],
  },
  {
    id: "d4-t4",
    domain: 4,
    domainLabel: "Design Cost-Optimized Architectures",
    weight: "20%",
    task: "Task 4.4 — Cost-optimized networking",
    checkpoints: [
      "NAT Gateway cost; VPC endpoints alternative",
      "Single NAT vs NAT per AZ",
      "Direct Connect vs VPN for steady traffic",
      "CloudFront to reduce origin egress",
      "Data transfer: cross-AZ, cross-Region, internet egress",
    ],
  },
];

/** Completed nightly study sessions — drives default checklist seeding. */
export const studyNights: StudyNight[] = [
  {
    night: 1,
    week: 1,
    title: "Baseline + Domain 1 intro",
    completedDate: "2026-06-15",
    lab: "Audit IAM policies on deploy user and ECS roles",
    practiceScore: "8/10",
    notes:
      "Audited github-actions-globalskiatlas policy v3 and S3WriteGlobalskiatlasOutput task role. Least-privilege separation passed. Missed Q1 (SCP vs IAM) and Q4 (RAM vs Identity Center).",
    reviewedServiceIds: [
      "iam",
      "cli",
      "ecs",
      "fargate",
      "ecr",
      "s3",
      "cognito",
      "organizations",
      "iam-identity-center",
      "ram",
      "cloudtrail",
      "config",
      "cloudformation",
      "kms",
      "shield",
      "waf",
      "guardduty",
      "secrets-manager",
      "ssm",
      "acm",
      "vpc",
    ],
    completedCheckpointIds: [
      "d1-t1-cp-0",
      "d1-t1-cp-1",
      "d1-t1-cp-2",
      "d1-t1-cp-3",
      "d1-t1-cp-4",
      "d1-t3-cp-0",
    ],
  },
  {
    night: 2,
    week: 1,
    title: "Lab 1A — KMS + S3 encryption",
    completedDate: "2026-06-17",
    lab: "SSE-KMS on study-lab/kms-test/ prefix in witcoskitech.com",
    practiceScore: "6/10",
    notes:
      "Created CMK alias/saa-study-witcoskitech; uploaded SSE-KMS test object alongside SSE-S3 site files. simulate: github-actions-globalskiatlas implicitDeny on kms:Decrypt + s3:GetObject. Missed Q6 (cross-account key policy + IAM), Q7 (Bucket Key cost), Q8 (Secrets Manager vs KMS), Q9 (bucket policy Deny for encryption).",
    reviewedServiceIds: ["kms", "s3", "cloudhsm", "macie", "iam"],
    completedCheckpointIds: ["d1-t2-cp-0"],
  },
  {
    night: 3,
    week: 1,
    title: "Lab 1B — Secrets Manager",
    completedDate: "2026-06-18",
    lab: "saa-study/gsa-wiki-cognito secret + WikiCognitoSecretRead on wiki Lambda role",
    practiceScore: "9/10",
    notes:
      "Created Cognito config secret (SSE-KMS with Night 2 CMK); scoped GetSecretValue + kms:Decrypt; simulate allowed on wiki role. SSM SecureString contrast at /saa-study/gsa-wiki-cognito. COGNITO_SECRET_ARN on sam-app-WikiApiFunction; code migration pending. Missed Q6 (KMS stores keys, Secrets Manager stores values).",
    reviewedServiceIds: ["secrets-manager", "ssm", "cognito", "kms", "lambda", "iam"],
    completedCheckpointIds: ["d1-t2-cp-2"],
  },
  {
    night: 4,
    week: 1,
    title: "Lab 1C — WAF on CloudFront",
    completedDate: "2026-06-19",
    lab: "saa-study-globalskiatlas-waf on E3BDMTLYF8G4VB — torn down after lab",
    practiceScore: "7/10",
    notes:
      "Created CLOUDFRONT Web ACL (CommonRuleSet, KnownBadInputs, SQLiRuleSet) on globalskiatlas.com; GET/POST api/wiki* allowed, SQLi probe blocked. Detached + deleted Web ACL to avoid ~$96/yr. Missed Q2 (CloudFront WAF=us-east-1), Q4 (ALB=REGIONAL scope), Q8 (Firewall Manager for org-wide WAF).",
    reviewedServiceIds: ["waf", "shield", "cloudfront", "network-firewall", "firewall-manager"],
    completedCheckpointIds: ["d1-t2-cp-3"],
  },
  {
    night: 5,
    week: 1,
    title: "CloudTrail + Config + Access Analyzer",
    completedDate: "2026-06-19",
    lab: "saa-study-account-trail + Config rules + GitHubActionsGlobalskiatlas v4",
    practiceScore: "9/10",
    notes:
      "Enabled multi-region CloudTrail (log validation) and Config recorder with S3 public-read + IAM MFA rules. Created ACCOUNT Access Analyzer (0 external findings). Tightened deploy policy: Iceland ecs:RunTask from ecs:*:* to us-east-1/298043721974; simulate still allowed. Quiz (night-5-quiz.json): missed Q4 (log file validation vs data events). TEARDOWN: delete Config at end of Week 1 (Night 6/7) — study-lab/week1-teardown-config.sh.",
    reviewedServiceIds: [
      "cloudtrail",
      "config",
      "guardduty",
      "iam",
      "security-hub",
      "inspector",
      "cloudwatch",
    ],
    completedCheckpointIds: ["d1-t3-cp-4"],
  },
  {
    night: 6,
    week: 1,
    title: "Week 1 review",
    completedDate: "2026-06-20",
    lab: "Full Week 1 teardown — Config, CloudTrail, Access Analyzer, SSM contrast param, kms-test object",
    practiceScore: "20/25",
    notes:
      "Week 1 recap quiz (night-6-quiz.json): missed Q4 (ECS execution vs task role), Q7 (Bucket Key vs Transfer Acceleration), Q14 (Firewall Manager vs Security Hub), Q17 (Config rule vs CloudWatch — second-guessed B), Q19 (Access Analyzer vs Control Tower). Teardown: study-lab/week1-teardown-full.sh — kept saa-study/gsa-wiki-cognito + CMK (wiki Lambda COGNITO_SECRET_ARN). Checked off Week 1 awareness: Control Tower, Macie, Artifact, Detective, Audit Manager, Service Catalog, Well-Architected.",
    reviewedServiceIds: [
      "control-tower",
      "macie",
      "artifact",
      "detective",
      "audit-manager",
      "directory-service",
      "service-catalog",
      "well-architected",
      "acm",
      "ssm",
    ],
    completedCheckpointIds: [
      "d1-t2-cp-1",
      "d1-t2-cp-4",
      "d1-t3-cp-1",
      "d1-t3-cp-2",
    ],
  },
  {
    night: 7,
    week: 1,
    title: "Week 1 consolidation",
    completedDate: "2026-06-20",
    lab: "Paper only — week1-security-architecture.md + week2-vpc-plan.md",
    practiceScore: "15/15",
    notes:
      "Drew security architecture for witcoskitech.com and globalskiatlas.com; planned Week 2 VPC (2-AZ private Fargate). Quiz (night-7-quiz.json): 15/15 on missed-topics drill — SCP, RAM, execution role, KMS, Bucket Key, Secrets Manager, WAF scope, Firewall Manager, log validation, Config vs CloudWatch, Access Analyzer, Control Tower. Week 1 complete — Night 8 VPC fundamentals next.",
    reviewedServiceIds: [
      "vpc",
      "organizations",
      "ram",
      "ecs",
      "ecr",
      "fargate",
    ],
    completedCheckpointIds: ["d1-t1-cp-3", "d1-t2-cp-3"],
  },
  {
    night: 8,
    week: 2,
    title: "VPC fundamentals",
    completedDate: "2026-06-21",
    lab: "Paper design — week2-vpc-plan.md (2-AZ private Fargate)",
    practiceScore: "8/10",
    notes:
      "Deep dive: public/private subnets, IGW, NAT (outbound-only), SG stateful vs NACL stateless, bastion vs SSM Session Manager, S3/ECR VPC endpoints. Quiz (night-8-quiz.json): 8/10 — missed Q2 (ECR needs ecr.api + ecr.dkr + S3 gateway endpoints, not IGW), Q7 (bastion jump host vs PrivateLink). Night 9 Lab 2A VPC build next.",
    reviewedServiceIds: ["vpc", "ssm", "privatelink"],
    completedCheckpointIds: ["d1-t2-cp-4", "d3-t4-cp-3", "d4-t4-cp-0"],
  },
  {
    night: 9,
    week: 2,
    title: "Lab 2A — VPC build (part 1)",
    completedDate: "2026-06-22",
    lab: "saa-study-gsa VPC — night-9-lab-vpc-build.sh → night-9-vpc-ids.json",
    practiceScore: "9/10",
    notes:
      "Built 2-AZ VPC: IGW, public/private subnets, route tables, NAT in public-a, Fargate SG. Quiz (night-9-quiz.json): 9/10 — missed Q3 (single NAT in AZ-a: no auto-failover to public-b; outbound lost until NAT recreated). NAT return-traffic / receptionist analogy solid. Night 10 — Run Iceland ECS task in private subnets.",
    reviewedServiceIds: ["vpc", "ec2", "ecs"],
    completedCheckpointIds: ["d4-t4-cp-1"],
  },
  {
    night: 10,
    week: 2,
    title: "Lab 2A — private Fargate (part 2)",
    completedDate: "2026-06-23",
    lab: "Iceland ecs:RunTask in private subnets — night-10-lab-fargate-run.sh → night-10-task-result.json",
    practiceScore: "8/10",
    notes:
      "Hands-on RunTask in private subnets (assignPublicIp DISABLED, NAT egress). User run b3ad523 exit 0, ENI 10.0.11.239 private-a; ECR pull + logs + S3 iceland/2026-06/ via NAT. Quiz (night-10-quiz.json): 8/10 — missed Q3 (task role for S3 PutObject, not execution role), Q4 (logs init = network to CloudWatch, not task role). Study VPC left up for Nights 11–12. Night 11 — ALB vs NLB vs GWLB theory.",
    reviewedServiceIds: ["ecs", "fargate", "ecr", "cloudwatch", "iam"],
    completedCheckpointIds: ["d3-t2-cp-2"],
  },
  {
    night: 11,
    week: 2,
    title: "ELB + ALB theory",
    completedDate: "2026-06-23",
    lab: "Theory — night-11-elb-theory.md (no AWS spend)",
    practiceScore: "14/20",
    notes:
      "ALB vs NLB vs GWLB decision tree solid (HTTP→ALB, TCP/UDP→NLB, firewall→GWLB). Quiz (night-11-quiz.json): 14/20 — missed Q9 (task SG inbound from ALB SG only, not shared 0.0.0.0/0 SG), Q10 (ALB cross-zone on by default, NLB off), Q13 (ALB multi-AZ DNS survives AZ loss — not cross-region replication), Q15 (GWLB endpoint in app VPC, not IGW), Q16 (HTTPS→HTTP = TLS termination not GENEVE), Q19 (WAF REGIONAL on ALB — Night 4 callback). Learned deregistration delay vs HealthCheckGracePeriod. Night 12 — EventBridge schedule.",
    reviewedServiceIds: ["elb", "route53", "waf"],
    completedCheckpointIds: ["d2-t2-cp-0"],
  },
  {
    night: 12,
    week: 2,
    title: "Lab 2B — EventBridge schedule",
    completedDate: "2026-06-24",
    lab: "EventBridge cron → Iceland RunTask — night-12-lab-eventbridge-schedule.ps1 → night-12-eventbridge-result.json",
    practiceScore: "13/15",
    notes:
      "Deployed saa-study-gsa-iceland-monthly (cron 0 6 1 * ? *) + ECS Fargate target in Night 9 private subnets; IAM role saa-study-gsa-eventbridge-ecs (events.amazonaws.com). TestFire: Invocations > 0, startedBy events-rule/..., exit 0. Quiz (night-12-quiz.json): 13/15 — missed Q11 (cluster condition = least privilege, not PassRole name match), Q13 (monthly cron cheaper than rate(1 minute) — Fargate cost dominates, not EventBridge per-invocation). Flashcards: FailedInvocations vs exit code 1; schedule vs event pattern. Night 13 — SQS decoupling.",
    reviewedServiceIds: ["eventbridge", "ecs", "fargate", "iam", "cloudwatch"],
    completedCheckpointIds: ["d2-t1-cp-1"],
  },
  {
    night: 13,
    week: 2,
    title: "Lab 2C — SQS decoupling",
    completedDate: "2026-06-25",
    lab: "SQS completion queue + DLQ + EventBridge ECS success → SQS — night-13-lab-sqs-setup.ps1",
    practiceScore: "12/15",
    notes:
      "E2E: Night 12 TestFire exit 0 → ECS Task State Change → saa-study-gsa-iceland-completion (startedBy events-rule/...). Quiz 12/15 — missed Q2 (visibility timeout < processing time = duplicates), Q10 (message reappears after timeout, not instant DLQ), Q12 (SQS is Regional). Rebuilt Night 9 VPC via night-9-lab-vpc-build.ps1; fixed Night 12 PS cron * glob. Teardown: NAT/VPC + SQS + EventBridge. Night 14 — SNS fan-out.",
    reviewedServiceIds: ["sqs", "eventbridge"],
    completedCheckpointIds: ["d2-t1-cp-1"],
  },
  {
    night: 14,
    week: 2,
    title: "Lab 2C part 2 — SNS fan-out",
    completedDate: "2026-06-26",
    lab: "SNS alerts topic + failure rule + SQS inbox sub + alarm action — night-14-lab-sns-setup.ps1 -TestPublish",
    practiceScore: "11/15",
    notes:
      "Deployed saa-study-gsa-iceland-alerts + saa-study-gsa-iceland-alerts-inbox (SNS→SQS fan-out) + saa-study-gsa-iceland-failure-to-sns (ECS exit ≠ 0). Quiz (night-14-quiz.json): 11/15 — missed Q2 (SNS→SQS queue policy + aws:SourceArn, not IAM ReceiveMessage), Q10 (filter policy skips sub silently — no filter DLQ), Q12 (SNS retries Lambda + subscription DLQ — not immediate delete), Q14 (cross-account = topic policy on A + IAM on B). Solid on Q4 FailedInvocations vs exit 1, Q9 SQS success / SNS failure split. Flashcards: mobile push APNS/FCM; raw message delivery. Night 15 — RDS + Aurora.",
    reviewedServiceIds: ["sns", "eventbridge", "cloudwatch"],
    completedCheckpointIds: ["d2-t1-cp-1"],
  },
  {
    night: 15,
    week: 3,
    title: "RDS + Aurora deep dive",
    completedDate: "2026-06-26",
    lab: "Theory — night-15-rds-aurora.md (no AWS spend)",
    practiceScore: "12/15",
    notes:
      "Quiz (night-15-quiz.json): 12/15 — missed Q5 (Global Database for sub-second cross-Region RPO, not promote read replica), Q7 (Aurora storage auto-scales — no manual GB), Q10 (PITR max retention 35 days, not 14/365). Solid on RDS Proxy (Q2/Q13), Serverless v2 no scale-to-zero (Q11), Multi-AZ vs async replicas (Q9), DynamoDB+Aurora split (Q15). Added plain-English database guide to night-15-rds-aurora.md. Quiz site: client-side load from public/study-lab + predev sync. Night 16 — Aurora lab.",
    reviewedServiceIds: ["rds", "aurora", "aurora-serverless", "rds-proxy"],
    completedCheckpointIds: ["d2-t2-cp-1", "d3-t3-cp-1"],
  },
  {
    night: 17,
    week: 3,
    title: "Lab 2D part 2 — Lambda stats uploader → Aurora",
    completedDate: "2026-06-27",
    lab: "Theory + quiz — night-17-lambda-aurora.md; setup/teardown scripts (Lambda not deployed tonight)",
    practiceScore: "11/15",
    notes:
      "Quiz (night-17-quiz.json): 11/15 — missed Q2 (writer endpoint for INSERT, not Data API), Q6 (study lab maps ECS completion → IS-001 UPSERT), Q12 (Aurora teardown does not break Night 13 SQS), Q13 (standard SQS at-least-once → idempotent UPSERT, not FIFO). Solid on ENI cold start (Q3), NAT egress (Q7), DynamoDB vs Aurora split (Q8/Q14), RDS Proxy (Q9). Fixed quiz site 0/15 bug (answer key used correct vs answer field). Plain-English ENI/TCP/RDS Proxy guide in night-17-lambda-aurora.md. Night 18 — DynamoDB resilience.",
    reviewedServiceIds: ["lambda", "aurora", "rds", "sqs", "secrets-manager", "vpc"],
    completedCheckpointIds: ["d2-t2-cp-1", "d3-t3-cp-1"],
  },
];

/** Merge all completed nights into default checklist state for first-time visitors. */
export function getStudyNightDefaults(): {
  services: Record<string, boolean>;
  tasks: Record<string, boolean>;
} {
  const services: Record<string, boolean> = {};
  const tasks: Record<string, boolean> = {};
  for (const night of studyNights) {
    for (const id of night.reviewedServiceIds) services[id] = true;
    for (const id of night.completedCheckpointIds) tasks[id] = true;
  }
  return { services, tasks };
}

export const reviewSchedule: { week: number; categories: string[]; serviceCount: number }[] = [
  { week: 1, categories: ["Security, Identity, and Compliance", "Management and Governance"], serviceCount: 28 },
  { week: 2, categories: ["Networking and Content Delivery", "Application Integration"], serviceCount: 17 },
  { week: 3, categories: ["Database", "Migration and Transfer"], serviceCount: 14 },
  { week: 4, categories: ["Analytics", "Compute", "Containers", "Storage"], serviceCount: 32 },
  { week: 5, categories: ["Cost Management", "Machine Learning", "Front-End Web and Mobile", "Media Services", "Developer Tools", "Serverless"], serviceCount: 22 },
];

export function countByReadiness(services: ExamService[]) {
  return {
    know: services.filter((s) => s.readiness === "know").length,
    partial: services.filter((s) => s.readiness === "partial").length,
    study: services.filter((s) => s.readiness === "study").length,
    awareness: services.filter((s) => s.readiness === "awareness").length,
    total: services.length,
  };
}
