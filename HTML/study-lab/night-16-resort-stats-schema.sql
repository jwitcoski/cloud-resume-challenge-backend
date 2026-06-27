-- Night 16 Lab 2D part 1 — sample relational schema for GSA stats layer
-- Applied by night-16-lab-aurora-setup.ps1 -InitSchema (RDS Data API)

CREATE TABLE IF NOT EXISTS resort_stats (
    resort_id     VARCHAR(64) PRIMARY KEY,
    resort_name   VARCHAR(255) NOT NULL,
    country_code  CHAR(2) NOT NULL,
    monthly_runs  INTEGER NOT NULL DEFAULT 0,
    last_run_at   TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO resort_stats (resort_id, resort_name, country_code, monthly_runs, last_run_at)
VALUES ('IS-001', 'Bláfjöll', 'IS', 1, NOW())
ON CONFLICT (resort_id) DO NOTHING;
