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

const mode = (process.argv[2] || "harsh").toLowerCase();
checks.setMode(mode === "normal" ? "normal" : "harsh");
const folder = process.argv[3] || "solutions";

const cat = JSON.parse(fs.readFileSync(path.join(root, "challenges", "catalog.json"), "utf8"));
const exts = [".html", ".js", ".swift", ".kt", ".dart", ".tsx", ".ts"];
function load(id) {
  for (const ext of exts) {
    const f = path.join(root, folder, id + ext);
    if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  }
  return null;
}

let sum = 0;
let n = 0;
const letters = {};
console.log("mode=" + checks.getMode());
for (const c of cat.challenges) {
  const src = load(c.id);
  if (!src) {
    console.log(c.id + ": MISSING");
    continue;
  }
  const g = checks.grade(src, c.checks);
  sum += g.pct;
  n++;
  letters[g.letter] = (letters[g.letter] || 0) + 1;
  const fails = g.checks.filter((x) => !x.pass).map((x) => x.id).join(", ");
  console.log(`${c.id}: ${g.pct}% ${g.letter}  fails=[${fails}]`);
}
console.log("---");
console.log("avg", Math.round(sum / n) + "%", "letters", JSON.stringify(letters));
