global.window = global;
require("./challenges/checks.js");
const fs = require("fs");
const path = require("path");
const catalog = JSON.parse(fs.readFileSync("./challenges/catalog.json", "utf8"));
const root = "./fighters";
for (const f of ["mapbox", "maptiler", "no-agent"]) {
  for (const s of catalog.skills.filter((x) => ["S01", "S02", "S03", "S04", "S05"].includes(x.id))) {
    const src = fs.readFileSync(path.join(root, f, s.id + ".html"), "utf8");
    const g = RumbleChecks.grade(src, s.checks[f] || []);
    const fails = (g.checks || []).filter((c) => !c.pass).map((c) => c.id).join(",");
    console.log(f, s.id, g.letter, g.pct + "%", fails || "ok");
  }
}
const s01 = fs.readFileSync(path.join(root, "no-agent", "S01.html"), "utf8");
console.log("NA S01 style", (s01.match(/style:\s*"([^"]+)"/) || [])[1]);
console.log("NA S01 center", (s01.match(/center:\s*(\[[^\]]+\])/) || [])[1]);
console.log("NA S01 zoom", (s01.match(/zoom:\s*(\d+)/) || [])[1]);
