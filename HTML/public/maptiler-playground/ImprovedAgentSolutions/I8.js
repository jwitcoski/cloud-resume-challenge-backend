#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

const SERVICE_ROOT = "https://service.maptiler.com/v1";
const TERMINAL_STATUSES = new Set(["completed", "failed", "canceled"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 200;

function requireServiceToken() {
  const token = process.env.MAPTILER_SERVICE_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "MAPTILER_SERVICE_TOKEN is required. Do not use the browser map key; " +
      "run this backend-only script with a service token in process.env."
    );
  }
  return token;
}

async function readJson(response, operation) {
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`${operation} returned non-JSON HTTP ${response.status}: ${text}`);
    }
  }
  if (!response.ok) {
    const detail = payload?.message || payload?.error || text || response.statusText;
    throw new Error(`${operation} failed with HTTP ${response.status}: ${detail}`);
  }
  return payload;
}

function serviceHeaders(token, includeJson = false) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(includeJson ? { "Content-Type": "application/json" } : {})
  };
}

async function createIngest(token, fileName, size) {
  const response = await fetch(`${SERVICE_ROOT}/datasets/ingest`, {
    method: "POST",
    headers: serviceHeaders(token, true),
    body: JSON.stringify({
      filename: fileName,
      size,
      output: { type: "vector_features" }
    })
  });
  const ingest = await readJson(response, "Create ingest");
  if (!ingest?.id || !ingest?.upload_url) {
    throw new Error("Create ingest response omitted id or upload_url.");
  }
  return ingest;
}

async function uploadBytes(uploadUrl, bytes) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(bytes.byteLength)
    },
    body: bytes
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Signed upload_url PUT failed with HTTP ${response.status}: ${detail || response.statusText}`
    );
  }
}

async function startProcessing(token, ingestId) {
  const response = await fetch(
    `${SERVICE_ROOT}/datasets/ingest/${encodeURIComponent(ingestId)}/process`,
    {
      method: "POST",
      headers: serviceHeaders(token)
    }
  );
  return readJson(response, "Start ingest processing");
}

async function getIngest(token, ingestId) {
  const response = await fetch(
    `${SERVICE_ROOT}/datasets/ingest/${encodeURIComponent(ingestId)}`,
    { headers: serviceHeaders(token) }
  );
  return readJson(response, "Read ingest status");
}

async function waitForCompletion(token, ingestId) {
  for (let poll = 1; poll <= MAX_POLLS; poll += 1) {
    const ingest = await getIngest(token, ingestId);
    const status = String(ingest?.status || "unknown").toLowerCase();
    console.log(`[${poll}/${MAX_POLLS}] ingest ${ingestId}: ${status}`);

    if (TERMINAL_STATUSES.has(status)) {
      if (status !== "completed") {
        const detail = ingest?.error || ingest?.message || "No failure detail supplied";
        throw new Error(`Ingest ended with status "${status}": ${detail}`);
      }
      return ingest;
    }
    if (!["upload", "processing", "unknown"].includes(status)) {
      throw new Error(`Service returned an unrecognized ingest status: ${status}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Ingest ${ingestId} did not finish after ${MAX_POLLS} polls.`);
}

async function main() {
  const inputArgument = process.argv[2];
  if (!inputArgument) {
    throw new Error("Usage: node I8.js <path-to-GeoJSON-or-supported-dataset>");
  }

  const token = requireServiceToken();
  const inputPath = resolve(inputArgument);
  const fileInfo = await stat(inputPath);
  if (!fileInfo.isFile() || fileInfo.size === 0) {
    throw new Error(`Input must be a non-empty regular file: ${inputPath}`);
  }

  const bytes = await readFile(inputPath);
  console.log(`Creating ingest for ${basename(inputPath)} (${fileInfo.size} bytes)`);
  const ingest = await createIngest(token, basename(inputPath), fileInfo.size);

  console.log(`Uploading bytes to the service-provided upload_url for ${ingest.id}`);
  await uploadBytes(ingest.upload_url, bytes);

  console.log(`Starting processing for ingest ${ingest.id}`);
  await startProcessing(token, ingest.id);

  const completed = await waitForCompletion(token, ingest.id);
  console.log(JSON.stringify({
    ingestId: completed.id || ingest.id,
    status: completed.status,
    datasetId: completed.dataset_id || completed.document_id || null
  }, null, 2));
}

main().catch((error) => {
  console.error("MapTiler dataset ingest failed:", error);
  process.exitCode = 1;
});
