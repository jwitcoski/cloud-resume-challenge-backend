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
  { id: "eventbridge", name: "Amazon EventBridge", category: "Application Integration", readiness: "partial", domain: "D2", examFocus: "Event bus; schedule rules; decouple microservices", gsaNote: "Documented for ECS cron", studyWeek: 2 },
  { id: "mq", name: "Amazon MQ", category: "Application Integration", readiness: "awareness", domain: "D2", examFocus: "Managed ActiveMQ/RabbitMQ; lift-and-shift messaging" },
  { id: "sns", name: "Amazon SNS", category: "Application Integration", readiness: "study", domain: "D2", examFocus: "Pub/sub fan-out; SMS/email/mobile push; SNS → SQS pattern", studyWeek: 2 },
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
  { id: "ecr", name: "Amazon ECR", category: "Containers", readiness: "know", domain: "D3", examFocus: "Private Docker registry; image scanning", gsaNote: "Backend pipeline images" },
  { id: "ecs", name: "Amazon ECS", category: "Containers", readiness: "know", domain: "D2/D3", examFocus: "Task definitions; services; Fargate vs EC2 launch", gsaNote: "Backend batch pipeline" },
  { id: "ecs-anywhere", name: "Amazon ECS Anywhere", category: "Containers", readiness: "awareness", domain: "D3", examFocus: "Run ECS tasks on your own hardware" },
  { id: "eks", name: "Amazon EKS", category: "Containers", readiness: "study", domain: "D2/D3", examFocus: "Managed Kubernetes; vs ECS when K8s required", studyWeek: 4 },
  { id: "eks-anywhere", name: "Amazon EKS Anywhere", category: "Containers", readiness: "awareness", domain: "D3", examFocus: "K8s on-premises" },
  { id: "eks-distro", name: "Amazon EKS Distro", category: "Containers", readiness: "awareness", domain: "D3", examFocus: "Open-source K8s distribution" },
  { id: "fargate", name: "AWS Fargate", category: "Containers", readiness: "know", domain: "D3/D4", examFocus: "Serverless containers; no EC2 to manage; per-task billing", gsaNote: "Backend ECS tasks" },

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
  { id: "cli", name: "AWS CLI", category: "Management and Governance", readiness: "know", domain: "D1", examFocus: "Scripting AWS operations", gsaNote: "Daily deploy scripts" },
  { id: "cloudformation", name: "AWS CloudFormation", category: "Management and Governance", readiness: "know", domain: "D2", examFocus: "IaC stacks; drift; nested stacks; StackSets", gsaNote: "SAM generates CFN" },
  { id: "cloudtrail", name: "AWS CloudTrail", category: "Management and Governance", readiness: "study", domain: "D1", examFocus: "API audit log; org trail; vs Config for compliance state", studyWeek: 1 },
  { id: "cloudwatch", name: "Amazon CloudWatch", category: "Management and Governance", readiness: "partial", domain: "D2/D3", examFocus: "Metrics, alarms, logs, dashboards, EventBridge integration", gsaNote: "Logs only so far", studyWeek: 2 },
  { id: "compute-optimizer", name: "AWS Compute Optimizer", category: "Management and Governance", readiness: "study", domain: "D4", examFocus: "Right-size EC2/EBS/Lambda recommendations", studyWeek: 5 },
  { id: "config", name: "AWS Config", category: "Management and Governance", readiness: "study", domain: "D1", examFocus: "Resource configuration history; rules; compliance", studyWeek: 1 },
  { id: "control-tower", name: "AWS Control Tower", category: "Management and Governance", readiness: "awareness", domain: "D1", examFocus: "Multi-account landing zone; guardrails" },
  { id: "health", name: "AWS Health Dashboard", category: "Management and Governance", readiness: "awareness", domain: "D2", examFocus: "AWS service events affecting your account" },
  { id: "license-manager", name: "AWS License Manager", category: "Management and Governance", readiness: "awareness", domain: "D4", examFocus: "Track software licenses on AWS" },
  { id: "organizations", name: "AWS Organizations", category: "Management and Governance", readiness: "study", domain: "D1", examFocus: "Multi-account; SCPs; consolidated billing", studyWeek: 1 },
  { id: "service-catalog", name: "AWS Service Catalog", category: "Management and Governance", readiness: "awareness", domain: "D1", examFocus: "Approved products for self-service provisioning" },
  { id: "ssm", name: "AWS Systems Manager", category: "Management and Governance", readiness: "study", domain: "D1", examFocus: "Parameter Store vs Secrets Manager; Patch Manager; Session Manager", studyWeek: 1 },
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
  { id: "cloudfront", name: "Amazon CloudFront", category: "Networking and Content Delivery", readiness: "know", domain: "D3/D4", examFocus: "CDN; OAC; cache behaviors; signed URLs; edge functions", gsaNote: "Frontend static + API origins" },
  { id: "direct-connect", name: "AWS Direct Connect", category: "Networking and Content Delivery", readiness: "study", domain: "D2/D4", examFocus: "Dedicated private link to AWS; vs VPN over internet", studyWeek: 3 },
  { id: "elb", name: "Elastic Load Balancing (ELB)", category: "Networking and Content Delivery", readiness: "study", domain: "D2/D3", examFocus: "ALB (L7) vs NLB (L4/TCP/UDP) vs GWLB (firewall)", studyWeek: 2 },
  { id: "global-accelerator", name: "AWS Global Accelerator", category: "Networking and Content Delivery", readiness: "study", domain: "D3/D4", examFocus: "Static anycast IPs; TCP/UDP; vs CloudFront for HTTP cache", studyWeek: 4 },
  { id: "privatelink", name: "AWS PrivateLink", category: "Networking and Content Delivery", readiness: "study", domain: "D1/D4", examFocus: "Private access to AWS services/other VPCs; no internet/NAT", studyWeek: 3 },
  { id: "route53", name: "Amazon Route 53", category: "Networking and Content Delivery", readiness: "partial", domain: "D2/D3", examFocus: "Routing policies; health checks; alias records; failover", gsaNote: "Basic DNS only", studyWeek: 4 },
  { id: "site-to-site-vpn", name: "AWS Site-to-Site VPN", category: "Networking and Content Delivery", readiness: "study", domain: "D2", examFocus: "IPsec tunnel on-premises ↔ VPC; quick/cheap vs DX", studyWeek: 3 },
  { id: "transit-gateway", name: "AWS Transit Gateway", category: "Networking and Content Delivery", readiness: "study", domain: "D2/D4", examFocus: "Hub for VPC/VPN/DX; vs full mesh peering", studyWeek: 3 },
  { id: "vpc", name: "Amazon VPC", category: "Networking and Content Delivery", readiness: "partial", domain: "D1/D2", examFocus: "Subnets, IGW, NAT GW, NACL vs SG, VPC endpoints, peering", gsaNote: "Fargate awsvpc only", studyWeek: 2 },

  // Security, Identity, and Compliance
  { id: "artifact", name: "AWS Artifact", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Download compliance reports (SOC, PCI)" },
  { id: "audit-manager", name: "AWS Audit Manager", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Continuous compliance audits" },
  { id: "acm", name: "AWS Certificate Manager (ACM)", category: "Security, Identity, and Compliance", readiness: "partial", domain: "D1", examFocus: "Free public TLS certs; must use us-east-1 for CloudFront", gsaNote: "CloudFront HTTPS", studyWeek: 1 },
  { id: "cloudhsm", name: "AWS CloudHSM", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Dedicated hardware HSM; vs KMS shared" },
  { id: "cognito", name: "Amazon Cognito", category: "Security, Identity, and Compliance", readiness: "know", domain: "D1", examFocus: "User pools vs identity pools; OAuth/OIDC; federated sign-in", gsaNote: "Frontend wiki auth" },
  { id: "detective", name: "Amazon Detective", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Investigate security findings root cause" },
  { id: "directory-service", name: "AWS Directory Service", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Managed Microsoft AD / Simple AD" },
  { id: "firewall-manager", name: "AWS Firewall Manager", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Central WAF/rule management across accounts" },
  { id: "guardduty", name: "Amazon GuardDuty", category: "Security, Identity, and Compliance", readiness: "study", domain: "D1", examFocus: "Threat detection from CloudTrail/VPC/ DNS logs", studyWeek: 1 },
  { id: "iam-identity-center", name: "AWS IAM Identity Center", category: "Security, Identity, and Compliance", readiness: "study", domain: "D1", examFocus: "SSO to AWS accounts and SaaS; successor to AWS SSO", studyWeek: 1 },
  { id: "inspector", name: "Amazon Inspector", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Automated vulnerability scanning for EC2/containers" },
  { id: "kms", name: "AWS KMS", category: "Security, Identity, and Compliance", readiness: "study", domain: "D1", examFocus: "CMK; envelope encryption; key policies vs IAM; SSE-KMS", studyWeek: 1 },
  { id: "macie", name: "Amazon Macie", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Discover/classify sensitive data in S3" },
  { id: "network-firewall", name: "AWS Network Firewall", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Stateful VPC traffic filtering" },
  { id: "ram", name: "AWS Resource Access Manager (RAM)", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Share subnets/transit gateway across accounts" },
  { id: "secrets-manager", name: "AWS Secrets Manager", category: "Security, Identity, and Compliance", readiness: "study", domain: "D1", examFocus: "Rotation; vs Parameter Store SecureString", studyWeek: 1 },
  { id: "security-hub", name: "AWS Security Hub", category: "Security, Identity, and Compliance", readiness: "awareness", domain: "D1", examFocus: "Aggregate findings from GuardDuty, Inspector, etc." },
  { id: "shield", name: "AWS Shield", category: "Security, Identity, and Compliance", readiness: "study", domain: "D1", examFocus: "Standard (free, L3/L4) vs Advanced (DDoS cost protection + WAF)", studyWeek: 1 },
  { id: "waf", name: "AWS WAF", category: "Security, Identity, and Compliance", readiness: "study", domain: "D1", examFocus: "Web ACLs; rate limiting; attach to CloudFront/ALB/API GW", studyWeek: 1 },
  { id: "iam", name: "IAM", category: "Security, Identity, and Compliance", readiness: "know", domain: "D1", examFocus: "Policies, roles, MFA, boundary, SCP, least privilege", gsaNote: "Deploy + ECS + Lambda roles" },

  // Serverless
  { id: "lambda", name: "AWS Lambda", category: "Serverless", readiness: "know", domain: "D2/D3", examFocus: "Concurrency, DLQ, VPC cold start, provisioned concurrency", gsaNote: "Frontend + backend APIs" },

  // Storage
  { id: "backup", name: "AWS Backup", category: "Storage", readiness: "study", domain: "D2/D4", examFocus: "Centralized backup for RDS, EBS, DynamoDB, etc.", studyWeek: 3 },
  { id: "ebs", name: "Amazon EBS", category: "Storage", readiness: "study", domain: "D3/D4", examFocus: "gp3/io2/st1/sc1; snapshots; Multi-Attach io2", studyWeek: 4 },
  { id: "efs", name: "Amazon EFS", category: "Storage", readiness: "study", domain: "D3/D4", examFocus: "Shared NFS; scales with EC2/Lambda; vs EBS block", studyWeek: 4 },
  { id: "fsx", name: "Amazon FSx", category: "Storage", readiness: "awareness", domain: "D4", examFocus: "Windows/Lustre/NetApp/ONTAP file systems" },
  { id: "s3", name: "Amazon S3", category: "Storage", readiness: "know", domain: "D3/D4", examFocus: "Storage classes; lifecycle; versioning; replication; OAC", gsaNote: "Frontend + backend buckets" },
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
