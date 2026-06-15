/**
 * After `next build` (static export with trailingSlash), copy each route's
 * index.html to a root-level .html file for S3 REST origin (CloudFront OAC).
 * Also keeps route/index.html for clean URLs when a viewer-request function
 * rewrites /path/ -> /path/index.html (see cloudfront-functions/s3-directory-index.js).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "out");

const skipDirs = new Set(["_next", "images", "404", "_not-found"]);

for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
  if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;

  const indexPath = path.join(outDir, entry.name, "index.html");
  if (!fs.existsSync(indexPath)) continue;

  const dest = path.join(outDir, `${entry.name}.html`);
  fs.copyFileSync(indexPath, dest);
  console.log(`postbuild-s3: ${entry.name}/index.html -> ${entry.name}.html`);
}
