#!/usr/bin/env bash
# Night 34 master study teardown — run lab scripts in safe order
# Run from repo: bash HTML/study-lab/night-34-lab-study-teardown.sh
#                bash HTML/study-lab/night-34-lab-study-teardown.sh --what-if
#
# Removes study-lab stacks to cut idle NAT, Aurora, ElastiCache, EC2 charges.
# KEEPS production: globalskiatlas.com / witcoskitech.com CloudFront, WAF, wiki API, Cognito, prod DynamoDB.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WHAT_IF=0
SKIP_VPC=0

for arg in "$@"; do
  case "$arg" in
    --what-if) WHAT_IF=1 ;;
    --skip-vpc) SKIP_VPC=1 ;;
  esac
done

run_step() {
  local name="$1"
  local script="$2"
  if [[ ! -f "$script" ]]; then
    echo "[skip] $name — script not found: $script"
    return 0
  fi
  if [[ "$WHAT_IF" -eq 1 ]]; then
    echo "[whatif] $name — $script"
    return 0
  fi
  echo ""
  echo "=== $name ==="
  bash "$script"
}

echo "Night 34 master study teardown"
echo "Keeps prod edge, wiki API, Cognito, and prod S3 objects."
[[ "$WHAT_IF" -eq 1 ]] && echo "WHATIF mode — no scripts executed."

run_step "Step Functions capstone (Night 32)" "$SCRIPT_DIR/night-32-lab-stepfunctions-teardown.sh"
run_step "S3 lifecycle study rule (Night 30)" "$SCRIPT_DIR/night-30-lab-s3-lifecycle-teardown.sh"
run_step "EC2/EBS demo (Night 27)" "$SCRIPT_DIR/night-27-lab-ec2-teardown.sh"
run_step "Route 53 lab records (Night 25)" "$SCRIPT_DIR/night-25-lab-route53-teardown.sh"
run_step "Athena/Glue lab (Night 24)" "$SCRIPT_DIR/night-24-lab-athena-teardown.sh"
run_step "ElastiCache Redis (Night 23)" "$SCRIPT_DIR/night-23-lab-elasticache-teardown.sh"
run_step "DMS/migration export lab (Night 20)" "$SCRIPT_DIR/night-20-lab-migration-teardown.sh"
run_step "AWS Backup lab (Night 19)" "$SCRIPT_DIR/night-19-lab-backup-teardown.sh"
run_step "Stats uploader Lambda (Night 17)" "$SCRIPT_DIR/night-17-lab-lambda-stats-teardown.sh"
run_step "Aurora study cluster (Night 16)" "$SCRIPT_DIR/night-16-lab-aurora-teardown.sh"
run_step "SNS study subscriptions (Night 14)" "$SCRIPT_DIR/night-14-lab-sns-teardown.sh"
run_step "SQS study queues (Night 13)" "$SCRIPT_DIR/night-13-lab-sqs-teardown.sh"
run_step "EventBridge legacy Iceland cron (Night 12)" "$SCRIPT_DIR/night-12-lab-eventbridge-teardown.sh"
run_step "Architecture audit result (Night 33)" "$SCRIPT_DIR/night-33-lab-architecture-teardown.sh"
run_step "Fargate rightsizing result (Night 31)" "$SCRIPT_DIR/night-31-lab-fargate-rightsizing-teardown.sh"

if [[ "$SKIP_VPC" -eq 1 ]]; then
  echo ""
  echo "[skip] Night 9 VPC — --skip-vpc set (NAT still billing)."
else
  run_step "VPC + NAT Gateway (Night 9)" "$SCRIPT_DIR/night-9-lab-vpc-teardown.sh"
fi

echo ""
echo "Master teardown complete."
echo "Still running (by design): prod CloudFront, WAF, wiki API, Cognito, visitor DynamoDB tables."
echo "Optional: week1-teardown-full.sh for Night 5 Config/CloudTrail labs if those were re-enabled."
