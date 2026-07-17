/**
 * Lightweight live harness — most Insane challenges are static-only.
 * Solutions may postMessage { type: 'maptiler-ready', facts: {...} }.
 */
(function (global) {
  function runLiveSmoke(sourceHtml, timeoutMs) {
    return new Promise((resolve) => {
      const needsLive = /maptilersdk|@maptiler\/sdk|new maptilersdk\.Map/i.test(sourceHtml);
      if (!needsLive) {
        resolve({ skipped: true, reason: "No SDK map to smoke-test" });
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.sandbox = "allow-scripts allow-same-origin";
      iframe.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
      document.body.appendChild(iframe);

      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        clearTimeout(timer);
        iframe.remove();
        resolve(result);
      };

      const onMsg = (ev) => {
        if (ev.data && ev.data.type === "maptiler-ready") {
          finish({ skipped: false, ok: true, facts: ev.data.facts || {} });
        }
      };
      window.addEventListener("message", onMsg);

      const timer = setTimeout(() => {
        finish({ skipped: false, ok: false, reason: "Live smoke timeout (no maptiler-ready)" });
      }, timeoutMs || 4000);

      try {
        const doc = iframe.contentDocument;
        doc.open();
        doc.write(sourceHtml);
        doc.close();
        // Probe after load
        setTimeout(() => {
          try {
            const w = iframe.contentWindow;
            if (w.__MAP__ || (w.maptilersdk && w.map)) {
              finish({
                skipped: false,
                ok: true,
                facts: { probed: true, hasMap: !!(w.__MAP__ || w.map) },
              });
            }
          } catch {
            /* cross-origin or not ready */
          }
        }, 2500);
      } catch (err) {
        finish({ skipped: false, ok: false, reason: String(err.message || err) });
      }
    });
  }

  const STORAGE_KEY = "maptiler-agent-scoreboard-v1";

  function loadRuns() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveRuns(runs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }

  function clearRuns() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  global.MapTilerHarness = {
    runLiveSmoke,
    loadRuns,
    saveRuns,
    clearRuns,
    uuid,
    STORAGE_KEY,
  };
})(typeof window !== "undefined" ? window : globalThis);
