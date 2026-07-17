/**
 * I8 — Admin / Service API tileset sketch
 * Base: https://service.maptiler.com/v1/
 *
 * Service token MUST come from process.env — never hardcode a UUID,
 * and never reuse the browser MAPTILER_API_KEY as a service token.
 */

const SERVICE_BASE = 'https://service.maptiler.com/v1';

function getServiceToken() {
  const token =
    process.env.MAPTILER_SERVICE_TOKEN ||
    process.env.MAPTILER_SERVICE_KEY ||
    process.env.SERVICE_TOKEN;
  if (!token) {
    throw new Error(
      'Set MAPTILER_SERVICE_TOKEN in the environment (Cloud Console → Service tokens). Do not use the browser map key.'
    );
  }
  return token;
}

async function listTilesets({ limit = 50, cursor } = {}) {
  const token = getServiceToken();
  const url = new URL(`${SERVICE_BASE}/tiles`);
  url.searchParams.set('limit', String(limit));
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`List tilesets failed: ${res.status} ${await res.text()}`);
  }
  return res.json(); // { cursor, items }
}

async function startDatasetIngest({ filename, size, outputType = 'vector_tileset' }) {
  const token = getServiceToken();
  const res = await fetch(`${SERVICE_BASE}/datasets/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      filename,
      size,
      output: { type: outputType },
    }),
  });
  if (!res.ok) {
    throw new Error(`Create ingest failed: ${res.status} ${await res.text()}`);
  }
  // Response includes upload_url — PUT the file there, then POST .../process
  return res.json();
}

async function main() {
  const page = await listTilesets({ limit: 20 });
  console.log('Tilesets:', (page.items || []).map((t) => t.id || t.document_id || t));
  // Outline only — upload when you have a local file:
  // const ingest = await startDatasetIngest({ filename: 'data.mbtiles', size: 123456 });
  // await fetch(ingest.upload_url, { method: 'PUT', body: fileBuffer });
  // await fetch(`${SERVICE_BASE}/datasets/ingest/${ingest.id}/process`, { method: 'POST', headers: { Authorization: `Bearer ${getServiceToken()}` } });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { listTilesets, startDatasetIngest, getServiceToken, SERVICE_BASE };
