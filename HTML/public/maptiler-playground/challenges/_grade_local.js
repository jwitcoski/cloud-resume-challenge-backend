const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join("HTML", "public", "maptiler-playground");
const code = fs.readFileSync(path.join(root, "challenges", "checks.js"), "utf8");
const sandbox = { window: {}, globalThis: {} };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const checks = sandbox.MapTilerSkillChecks;
const cat = JSON.parse(fs.readFileSync(path.join(root, "challenges", "catalog.json"), "utf8"));
const exts = [".html", ".js", ".swift", ".kt", ".dart", ".tsx", ".ts"];
function load(id) {
  for (const ext of exts) {
    const f = path.join(root, "solutions", id + ext);
    if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  }
  return null;
}
let sum = 0, n = 0;
for (const c of cat.challenges) {
  const src = load(c.id);
  if (!src) {
    console.log(c.id + ": MISSING");
    continue;
  }
  const g = checks.grade(src, c.checks);
  sum += g.pct;
  n++;
  const fails = g.checks.filter((x) => !x.pass).map((x) => x.id).join(", ");
  console.log(`${c.id}: ${g.pct}% ${g.letter}  fails=[${fails}]`);
}
console.log("---");
console.log("avg", Math.round(sum / n) + "%");
