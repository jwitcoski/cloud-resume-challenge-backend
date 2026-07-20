/**
 * I8 — Service/Admin tileset sketch
 * Token from process.env only — never hardcode, never reuse browser map key.
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://service.maptiler.com/v1';

function token() {
  const t = process.env.MAPTILER_SERVICE_TOKEN || process.env.SERVICE_TOKEN || '';
  if (!t) {
    throw new Error(
      'Set MAPTILER_SERVICE_TOKEN (service credential). Do not use MAPTILER_API_KEY.'
    );
  }
  return t;
}

function headers() {
  return {
    Authorization: 'Token ' + token(),
    Accept: 'application/json',
  };
}

export async function listTiles() {
  const res = await fetch(BASE + '/tiles?limit=25', { headers: headers() });
  if (!res.ok) throw new Error('list failed ' + res.status + ' ' + (await res.text()));
  return res.json();
}

export async function ingestFile(filePath) {
  const abs = path.resolve(filePath);
  const size = fs.statSync(abs).size;
  const filename = path.basename(abs);

  const create = await fetch(BASE + '/datasets/ingest', {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, size }),
  });
  if (!create.ok) throw new Error('ingest create ' + create.status);

  const body = await create.json();
  const id = body.id || body.ingest_id;
  const uploadUrl = body.upload_url;
  if (!id || !uploadUrl) throw new Error('missing upload_url/id');

  const up = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: fs.readFileSync(abs),
  });
  if (!up.ok) throw new Error('upload ' + up.status);

  const proc = await fetch(BASE + '/datasets/ingest/' + id + '/process', {
    method: 'POST',
    headers: headers(),
  });
  if (!proc.ok) throw new Error('process ' + proc.status);
  return proc.json();
}

async function main() {
  console.log(await listTiles());
  if (process.argv[2]) console.log(await ingestFile(process.argv[2]));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
