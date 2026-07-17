/**
 * I8 — Admin Tileset Sketch
 *
 * Upload/list tilesets via the MapTiler Service (Admin) API.
 * Service token MUST come from process.env — never hardcode a UUID.
 * Do not use the browser map key as a service token.
 *
 * Base: https://service.maptiler.com/v1/
 * Docs: datasets/ingest → upload to upload_url → POST .../process
 *
 * Usage:
 *   MAPTILER_SERVICE_TOKEN=… node I8.js ./path/to/data.mbtiles
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://service.maptiler.com/v1';

function getServiceToken() {
  const token =
    process.env.MAPTILER_SERVICE_TOKEN ||
    process.env.SERVICE_TOKEN ||
    '';
  if (!token) {
    throw new Error(
      'Set MAPTILER_SERVICE_TOKEN in the environment. ' +
        'Do not use the browser MAPTILER_API_KEY as a service token.'
    );
  }
  return token;
}

function authHeaders(token) {
  return {
    Authorization: `Token ${token}`,
    Accept: 'application/json',
  };
}

/** List tilesets belonging to the account. */
export async function listTilesets({ limit = 50, cursor } = {}) {
  const token = getServiceToken();
  const url = new URL(`${BASE}/tiles`);
  url.searchParams.set('limit', String(limit));
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`List tilesets failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Full ingest pipeline:
 * 1) POST /datasets/ingest  → { id, upload_url, … }
 * 2) PUT file bytes to upload_url
 * 3) POST /datasets/ingest/{id}/process
 */
export async function ingestAndProcess(filePath, outputType) {
  const token = getServiceToken();
  const abs = path.resolve(filePath);
  const stat = fs.statSync(abs);
  const filename = path.basename(abs);

  const ingestBody = {
    filename,
    size: stat.size,
  };
  if (outputType) {
    ingestBody.output = { type: outputType };
  }

  const createRes = await fetch(`${BASE}/datasets/ingest`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ingestBody),
  });
  if (!createRes.ok) {
    throw new Error(
      `Create ingest failed: ${createRes.status} ${await createRes.text()}`
    );
  }

  const ingest = await createRes.json();
  const ingestId = ingest.id || ingest.ingest_id;
  const uploadUrl = ingest.upload_url;
  if (!uploadUrl || !ingestId) {
    throw new Error('Ingest response missing upload_url or id');
  }

  const fileBuf = fs.readFileSync(abs);
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: fileBuf,
  });
  if (!uploadRes.ok) {
    throw new Error(
      `Upload failed: ${uploadRes.status} ${await uploadRes.text()}`
    );
  }

  // Start processing after the file has been fully uploaded
  const processRes = await fetch(
    `${BASE}/datasets/ingest/${ingestId}/process`,
    {
      method: 'POST',
      headers: authHeaders(token),
    }
  );
  if (!processRes.ok) {
    throw new Error(
      `Process failed: ${processRes.status} ${await processRes.text()}`
    );
  }

  return processRes.json();
}

/** Poll ingest status until completed / failed / canceled. */
export async function waitForIngest(ingestId, { intervalMs = 3000 } = {}) {
  const token = getServiceToken();
  for (;;) {
    const res = await fetch(`${BASE}/datasets/ingest/${ingestId}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) {
      throw new Error(`Status failed: ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    const status = body.status || body.state;
    if (['completed', 'failed', 'canceled'].includes(status)) {
      return body;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function main() {
  const fileArg = process.argv[2];
  console.log(
    'Note: browser map key ≠ service token — use MAPTILER_SERVICE_TOKEN only.'
  );
  console.log('Listing tilesets…');
  const page = await listTilesets({ limit: 20 });
  console.log(
    'Tilesets:',
    Array.isArray(page.items) ? page.items.length : page
  );

  if (fileArg) {
    console.log('Ingesting', fileArg);
    const result = await ingestAndProcess(fileArg);
    console.log('Process started:', result);
  } else {
    console.log(
      'Pass a dataset file path to run ingest → upload_url → /process'
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});