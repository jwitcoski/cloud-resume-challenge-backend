/**
 * After `next build` (static export with trailingSlash), copy each route's
 * index.html to a sibling .html file for S3 REST origin (CloudFront OAC).
 *
 * CloudFront viewer-request (cloudfront-functions/s3-directory-index.js) rewrites:
 *   /path/     -> /path/index.html
 *   /path      -> /path/index.html  (when URI has no ".")
 *
 * So playground demos must live at demo/index.html for clean URLs. This script
 * also emits demo.html copies so legacy *.html bookmarks keep working.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "out");

/** Top-level Next/export dirs we never promote to /name.html */
const rootSkip = new Set(["_next", "images", "404", "_not-found"]);

/** Nested dirs that are assets, not pages */
const nestedSkip = new Set(["data", "js", "docs", "images", "admin-boundaries"]);

function copyIndexAsHtml(dirAbs, depth = 0) {
  if (!fs.existsSync(dirAbs)) return;

  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (depth === 0 && rootSkip.has(entry.name)) continue;
    if (depth > 0 && nestedSkip.has(entry.name)) continue;

    const childAbs = path.join(dirAbs, entry.name);
    const indexPath = path.join(childAbs, "index.html");
    if (fs.existsSync(indexPath)) {
      const dest = path.join(dirAbs, `${entry.name}.html`);
      fs.copyFileSync(indexPath, dest);
      console.log(`postbuild-s3: ${path.relative(outDir, indexPath)} -> ${path.relative(outDir, dest)}`);
    }

    // Recurse into hub folders (mapbox-playground/*, admin-boundaries/tool, etc.)
    if (depth < 1) {
      copyIndexAsHtml(childAbs, depth + 1);
    }
  }
}

copyIndexAsHtml(outDir);
