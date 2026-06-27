#!/usr/bin/env python3
"""Night 16 helper — Serverless v2 scaling + db.serverless instance when AWS CLI is too old."""
from __future__ import annotations

import sys
import time

import boto3

REGION = "us-east-1"
CLUSTER_ID = "saa-study-gsa-aurora"
INSTANCE_ID = "saa-study-gsa-aurora-instance"
MIN_ACU = 0.5
MAX_ACU = 1.0


def wait_cluster(rds, cluster_id: str, timeout_sec: int = 1200) -> None:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        status = rds.describe_db_clusters(DBClusterIdentifier=cluster_id)["DBClusters"][0]["Status"]
        print(f"  Cluster status: {status}")
        if status == "available":
            return
        if status in {"failed", "incompatible-parameters", "incompatible-restore"}:
            raise RuntimeError(f"Cluster {cluster_id} status {status}")
        time.sleep(30)
    raise TimeoutError(f"Cluster {cluster_id} not available within {timeout_sec}s")


def wait_instance(rds, instance_id: str, timeout_sec: int = 1200) -> None:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            status = rds.describe_db_instances(DBInstanceIdentifier=instance_id)["DBInstances"][0][
                "DBInstanceStatus"
            ]
        except rds.exceptions.DBInstanceNotFoundFault:
            status = "pending"
        print(f"  Instance status: {status}")
        if status == "available":
            return
        if status == "failed":
            raise RuntimeError(f"Instance {instance_id} failed")
        time.sleep(30)
    raise TimeoutError(f"Instance {instance_id} not available within {timeout_sec}s")


def main() -> int:
    rds = boto3.client("rds", region_name=REGION)

    print("Applying Serverless v2 scaling configuration via boto3 ...")
    rds.modify_db_cluster(
        DBClusterIdentifier=CLUSTER_ID,
        ServerlessV2ScalingConfiguration={"MinCapacity": MIN_ACU, "MaxCapacity": MAX_ACU},
        ApplyImmediately=True,
    )
    wait_cluster(rds, CLUSTER_ID)

    instances = rds.describe_db_clusters(DBClusterIdentifier=CLUSTER_ID)["DBClusters"][0].get(
        "DBClusterMembers", []
    )
    if any(m.get("DBInstanceIdentifier") == INSTANCE_ID for m in instances):
        print(f"Instance {INSTANCE_ID} already attached to cluster.")
        wait_instance(rds, INSTANCE_ID)
        return 0

    print(f"Creating instance {INSTANCE_ID} (db.serverless) ...")
    rds.create_db_instance(
        DBInstanceIdentifier=INSTANCE_ID,
        DBClusterIdentifier=CLUSTER_ID,
        Engine="aurora-postgresql",
        DBInstanceClass="db.serverless",
        PubliclyAccessible=False,
    )
    wait_instance(rds, INSTANCE_ID)
    print("Serverless v2 instance ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
