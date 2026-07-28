global.window = global;
require("./challenges/checks.js");
const fs = require("fs");
const s = JSON.parse(fs.readFileSync("./challenges/catalog.json", "utf8")).skills.find((x) => x.id === "S15");
for (const f of ["mapbox", "maptiler", "no-agent"]) {
  const src = fs.readFileSync("./fighters/" + f + "/S15.html", "utf8");
  const g = RumbleChecks.grade(src, s.checks[f]);
  console.log(
    f,
    g.letter,
    g.pct + "%",
    (g.checks || []).filter((c) => !c.pass).map((c) => c.id + ":" + c.detail).join(" | ") || "ok"
  );
}
