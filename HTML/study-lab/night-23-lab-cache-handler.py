"""Night 23 cache-aside reader — Lambda in VPC: Redis first, Aurora on miss."""
import json
import os
import ssl
import time

import boto3
import pg8000.native
import redis

CACHE_TTL_SEC = 300
DEFAULT_RESORT_ID = "IS-001"


def handler(event, context):
    if event.get("action") == "bench":
        return bench_latency(event.get("resort_id", DEFAULT_RESORT_ID))
    resort_id = event.get("resort_id", DEFAULT_RESORT_ID)
    return get_resort_stats(resort_id)


def get_redis_client():
    host = os.environ["REDIS_HOST"]
    port = int(os.environ.get("REDIS_PORT", "6379"))
    return redis.Redis(
        host=host,
        port=port,
        ssl=False,
        socket_connect_timeout=5,
        decode_responses=True,
    )


def cache_key(resort_id):
    return f"resort_stats:{resort_id}"


def get_resort_stats(resort_id):
    started = time.perf_counter()
    client = get_redis_client()
    key = cache_key(resort_id)

    cached = client.get(key)
    if cached:
        return {
            "cache_hit": True,
            "source": "elasticache",
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "data": json.loads(cached),
        }

    row = fetch_from_aurora(resort_id)
    client.setex(key, CACHE_TTL_SEC, json.dumps(row))
    return {
        "cache_hit": False,
        "source": "aurora",
        "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        "data": row,
    }


def bench_latency(resort_id):
    client = get_redis_client()
    client.delete(cache_key(resort_id))
    cold = get_resort_stats(resort_id)
    warm = get_resort_stats(resort_id)
    return {
        "resort_id": resort_id,
        "pattern": "cache-aside",
        "cold": {"cache_hit": cold["cache_hit"], "latency_ms": cold["latency_ms"]},
        "warm": {"cache_hit": warm["cache_hit"], "latency_ms": warm["latency_ms"]},
    }


def get_db_credentials():
    secret_arn = os.environ["DB_SECRET_ARN"]
    sm = boto3.client("secretsmanager")
    raw = sm.get_secret_value(SecretId=secret_arn)["SecretString"]
    data = json.loads(raw)
    username = data.get("username") or data.get("user")
    password = data.get("password")
    if not username or not password:
        raise ValueError("Secret missing username/password")
    return username, password


def fetch_from_aurora(resort_id):
    host = os.environ["DB_HOST"]
    database = os.environ.get("DB_NAME", "gsa_stats")
    user, password = get_db_credentials()

    conn = pg8000.native.Connection(
        user=user,
        password=password,
        host=host,
        database=database,
        port=5432,
        ssl_context=ssl.create_default_context(),
    )
    try:
        rows = conn.run(
            """
            SELECT resort_id, resort_name, country_code, monthly_runs, last_run_at
            FROM resort_stats
            WHERE resort_id = :resort_id
            """,
            resort_id=resort_id,
        )
        if not rows:
            return {"resort_id": resort_id, "found": False}
        row = rows[0]
        return {
            "resort_id": row[0],
            "resort_name": row[1],
            "country_code": row[2],
            "monthly_runs": row[3],
            "last_run_at": str(row[4]) if row[4] else None,
            "found": True,
        }
    finally:
        conn.close()
