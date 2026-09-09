import React, { useState, useEffect } from "react";

const GROUPS = [
  { id: "seed-planters", name: "Seed planters", latin: "wildflower mixes", aka: "Save the Bees + Bring Home the Butterflies", detail: "3 troughs on the patio, sown 8/30/26", interval: 1, water: "tap", check: "surface must never dry out — reseed round" },
  { id: "venus-flytrap", name: "Venus flytrap", latin: "Dionaea muscipula", aka: "flytrap", detail: "terrarium cup, patio", interval: 2, water: "distilled", check: "keep soil damp — stand the cup in 1/2 inch of distilled water" },
  { id: "sweet-potato-vine", name: "Sweet potato vine", latin: "Ipomoea batatas", aka: "ornamental sweet potato, tuber vine", detail: "potted, patio", interval: 2, water: "tap", check: "top 1 inch dry — wilts fast, recovers fast" },
  { id: "outdoor-spiders", name: "Outdoor spider plants", latin: "Chlorophytum comosum", aka: "airplane plant, ribbon plant", detail: "2 pots on the patio", interval: 4, water: "tap", check: "top 1 inch dry" },
  { id: "calathea", name: "Calathea", latin: "Calathea roseopicta", aka: "prayer plant, medallion", detail: "on the bar cabinet", interval: 6, water: "filtered", check: "top 1 inch dry" },
  { id: "tradescantia", name: "Tradescantia", latin: "Tradescantia zebrina", aka: "wandering dude, inch plant, silver inch", detail: "hanging, bedroom", interval: 6, water: "tap", check: "top 1 inch dry — bottom-soak the pot 30 min, then drain fully", soak: 1800 },
  { id: "spider-indoor", name: "Curly spider plant", latin: "Chlorophytum comosum 'Bonnie'", aka: "spider ivy, airplane plant", detail: "hanging, bedroom window", interval: 8, water: "filtered", check: "top 1 inch dry" },
  { id: "money-tree", name: "Money tree", latin: "Pachira aquatica", aka: "Malabar chestnut, braided money plant", detail: "office window", interval: 12, water: "tap", check: "top 2 inches dry" },
  { id: "string-of-hearts", name: "String of hearts", latin: "Ceropegia woodii", aka: "rosary vine, chain of hearts", detail: "hanging, bedroom", interval: 12, water: "tap", check: "bone dry, then wait a day" },
  { id: "citrus", name: "Citrus trees", latin: "Citrus × limon, Citrus × sinensis", aka: "the lemon and the orange", detail: "back fence", interval: 14, water: "hose", check: "deep soak at the drip line, 30 min", soak: 1800 },
];

const PALETTE = {
  ink: "#0C1A17",
  panel: "#132724",
  panelEdge: "#1F3E38",
  mist: "#CFE3D6",
  moss: "#4FA678",
  fresh: "#8FD3A4",
  parch: "#D9A648",
  dry: "#C2603F",
  quiet: "#6E8B80",
};

const DAY = 86400000;

// Local calendar date as YYYY-MM-DD. toISOString() would convert to UTC,
// which rolls the date over at the wrong hour for anyone west of Greenwich.
const dateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Parse a YYYY-MM-DD key back to local noon, safely away from DST edges.
const fromKey = (iso) => new Date(`${iso}T12:00:00`);

const daysBetween = (iso, today) =>
  Math.round((fromKey(today) - fromKey(iso)) / DAY);

// Shared log lives in Netlify Blobs, reached through /api/log.
// Personal data (just the user's name) stays in localStorage.
const api = {
  async get() {
    const r = await fetch("/api/log");
    if (!r.ok) throw new Error(`GET /api/log ${r.status}`);
    return r.json();
  },
  async set(entries) {
    const r = await fetch("/api/log", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries),
    });
    if (!r.ok) throw new Error(`PUT /api/log ${r.status}`);
    return r.json();
  },
};

const hasStorage = () => typeof fetch === "function";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await wait(400 * (i + 1));
    }
  }
  throw lastErr;
}

function fmt(iso) {
  return fromKey(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PlantLog() {
  const [log, setLog] = useState(null);
  const [who, setWho] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [open, setOpen] = useState(null);
  const [status, setStatus] = useState("Loading the log…");
  const [namePersisted, setNamePersisted] = useState(true);
  const [offline, setOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [today, setToday] = useState(dateKey());

  // Pull in other people's waterings periodically and on refocus, so two
  // housemates with the app open don't work from stale counts.
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      if (document.hidden) return;
      try {
        const fresh = await api.get();
        if (!cancelled) {
          setLog(fresh || {});
          setOffline(false);
        }
      } catch {
        /* keep showing what we have */
      }
    };
    const t = setInterval(pull, 30000);
    window.addEventListener("focus", pull);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener("focus", pull);
    };
  }, []);

  // Recompute the date on a timer and whenever the app is brought back into
  // view, so a session left open overnight doesn't keep showing yesterday.
  useEffect(() => {
    const sync = () => setToday(dateKey());
    const t = setInterval(sync, 60000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    (async () => {
      let entries = {};
      if (!hasStorage()) {
        setOffline(true);
        setLog({});
        setStatus("");
        return;
      }
      try {
        entries = await withRetry(() => api.get(), 2);
        setOffline(false);
      } catch {
        entries = {};
        setOffline(true);
      }
      setLog(entries || {});
      try {
        const w = localStorage.getItem("plant-log-who");
        if (w) setWho(w);
      } catch {
        /* private browsing, or storage disabled */
      }
      setStatus("");
    })();
  }, []);

  async function saveName(n) {
    const clean = n.trim();
    if (!clean) return;
    setWho(clean);
    setStatus("");
    try {
      localStorage.setItem("plant-log-who", clean);
      setNamePersisted(true);
    } catch {
      setNamePersisted(false);
    }
  }

  async function persist(next) {
    if (!hasStorage()) {
      setSyncing(false);
      setOffline(true);
      return;
    }
    setSyncing(true);
    try {
      await withRetry(() => api.set(next));
      setOffline(false);
      setStatus("");
    } catch {
      setOffline(true);
    } finally {
      setSyncing(false);
    }
  }

  async function logWatering(groupId, when) {
    const stamp = { date: when || today, by: who };
    const next = { ...log };
    const prior = (next[groupId] || []).filter((e) => e.date !== stamp.date);
    next[groupId] = [stamp, ...prior]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 40);
    setLog(next);
    await persist(next);
  }

  async function undo(groupId, date) {
    const next = { ...log };
    next[groupId] = (next[groupId] || []).filter((e) => e.date !== date);
    setLog(next);
    await persist(next);
  }

  async function retrySync() {
    await persist(log);
  }

  if (log === null) {
    return (
      <div style={{ background: PALETTE.ink, color: PALETTE.mist, minHeight: "100vh", padding: 24, fontFamily: "system-ui" }}>
        {status}
      </div>
    );
  }

  if (!who) {
    return (
      <>
        <Style />
        <div className="pl-root">
          <div className="pl-gate">
            <p className="pl-eyebrow">Shared house log</p>
            <h1 className="pl-display">Who's watering?</h1>
            <p className="pl-note">
              Your name goes next to each watering so everyone can see who already handled it.
            </p>
            <input
              className="pl-input"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="First name"
            />
            <button className="pl-primary" onClick={() => saveName(nameDraft)}>
              Start logging
            </button>
          </div>
        </div>
      </>
    );
  }

  const rows = GROUPS.map((g) => {
    const history = log[g.id] || [];
    const last = history[0];
    const since = last ? daysBetween(last.date, today) : null;
    const remaining = since === null ? -1 : g.interval - since;
    return { ...g, history, last, since, remaining };
  }).sort((a, b) => a.remaining - b.remaining);

  const dueCount = rows.filter((r) => r.remaining <= 0).length;

  return (
    <>
      <Style />
      <div className="pl-root">
        <header className="pl-head">
          <p className="pl-eyebrow">
            {fromKey(today).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="pl-display">
            {dueCount === 0 ? "Everything's watered" : `${dueCount} ${dueCount === 1 ? "group needs" : "groups need"} water`}
          </h1>
          <p className="pl-note">
            Logged in as {who}. The bar shows how much of each plant's window is left — always finger-test before you pour.
          </p>
        </header>

        {offline && (
          <div className="pl-status">
            <p className="pl-statusText">
              Can't reach the shared log right now. Your taps are recorded in this
              window, but housemates won't see them until the connection is back.
            </p>
            <button className="pl-ghost" onClick={retrySync} disabled={syncing}>
              {syncing ? "Retrying…" : "Retry sync"}
            </button>
          </div>
        )}
        {!offline && status && <p className="pl-status">{status}</p>}

        <div className="pl-list">
          {rows.map((r) => {
            const pct = r.since === null ? 0 : Math.max(0, Math.min(1, 1 - r.since / r.interval));
            const tone = r.remaining <= 0 ? PALETTE.dry : pct < 0.35 ? PALETTE.parch : PALETTE.moss;
            const wateredToday = r.last && r.last.date === today;
            return (
              <section key={r.id} className="pl-card">
                <div className="pl-cardTop">
                  <div>
                    <h2 className="pl-name">{r.name}</h2>
                    <p className="pl-aka">a.k.a. {r.aka}</p>
                    <p className="pl-latin">{r.latin}</p>
                    <p className="pl-detail">{r.detail}</p>
                  </div>
                  <span className="pl-tag" style={{ color: tone, borderColor: tone }}>
                    {r.since === null
                      ? "no record"
                      : r.remaining > 0
                      ? `${r.remaining}d left`
                      : r.remaining === 0
                      ? "due today"
                      : `${Math.abs(r.remaining)}d overdue`}
                  </span>
                </div>

                <div className="pl-meter" aria-hidden="true">
                  <div className="pl-meterFill" style={{ width: `${pct * 100}%`, background: tone }} />
                </div>

                <div className="pl-meta">
                  <span>
                    {r.last
                      ? `Last watered ${r.since === 0 ? "today" : r.since === 1 ? "yesterday" : `${r.since} days ago`}${r.last.by ? ` by ${r.last.by}` : ""}`
                      : "Never logged"}
                  </span>
                  <span className="pl-dot">·</span>
                  <span>every {r.interval} days</span>
                  <span className="pl-dot">·</span>
                  <span className={r.water === "distilled" ? "pl-water pl-warn" : "pl-water"}>{r.water === "distilled"
                      ? "DISTILLED OR RAINWATER ONLY — tap water kills it"
                      : r.water === "filtered"
                      ? "filtered water only"
                      : r.water === "hose"
                      ? "hose, deep soak"
                      : "tap is fine"}</span>
                </div>

                <p className="pl-check">Check: {r.check}</p>

                {r.soak && (
                  <SoakTimer
                    seconds={r.soak}
                    label={`${Math.round(r.soak / 60)}-minute soak`}
                  />
                )}

                <div className="pl-actions">
                  <button
                    className={wateredToday ? "pl-done" : "pl-primary"}
                    onClick={() => (wateredToday ? undo(r.id, r.last.date) : logWatering(r.id))}
                  >
                    {wateredToday ? `Watered today by ${r.last.by || "someone"} — undo` : "I watered this"}
                  </button>
                  <button className="pl-ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    {open === r.id ? "Hide history" : "History"}
                  </button>
                </div>

                {open === r.id && (
                  <div className="pl-history">
                    <Strip history={r.history} interval={r.interval} today={today} />
                    <Backdate
                      today={today}
                      existing={r.history.map((e) => e.date)}
                      onAdd={(d) => logWatering(r.id, d)}
                    />
                    {r.history.length === 0 ? (
                      <p className="pl-empty">Nothing logged yet. The first watering you record starts the clock.</p>
                    ) : (
                      <ul className="pl-entries">
                        {r.history.slice(0, 8).map((e) => (
                          <li key={e.date}>
                            <span>{fmt(e.date)}</span>
                            <span className="pl-entryRight">
                              <span className="pl-by">{e.by || "unsigned"}</span>
                              <button
                                className="pl-remove"
                                onClick={() => undo(r.id, e.date)}
                                aria-label={`Remove the ${fmt(e.date)} entry`}
                              >
                                ×
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <footer className="pl-foot">
          <p>
            Everyone in the house sees the same log. Names and dates are shared.
            {!namePersisted && " Your name is set for this session only — this device didn't keep it."}
          </p>
          <button className="pl-ghost" onClick={() => { setWho(""); setNameDraft(""); }}>
            Not {who}?
          </button>
        </footer>
      </div>
    </>
  );
}

function Backdate({ today, existing, onAdd }) {
  const [picked, setPicked] = useState("");
  const yesterday = dateKey(new Date(fromKey(today) - DAY));
  const twoAgo = dateKey(new Date(fromKey(today) - 2 * DAY));

  const quick = [
    { label: "Yesterday", date: yesterday },
    { label: "2 days ago", date: twoAgo },
  ];

  return (
    <div className="pl-backdate">
      <p className="pl-stripLabel">Missed logging one? Add the day it actually got watered.</p>
      <div className="pl-quickRow">
        {quick.map((q) => (
          <button
            key={q.date}
            className="pl-ghost pl-quick"
            disabled={existing.includes(q.date)}
            onClick={() => onAdd(q.date)}
          >
            {existing.includes(q.date) ? `${q.label} ✓` : q.label}
          </button>
        ))}
      </div>
      <div className="pl-quickRow">
        <input
          type="date"
          className="pl-date"
          value={picked}
          max={today}
          onChange={(e) => setPicked(e.target.value)}
        />
        <button
          className="pl-ghost pl-quick"
          disabled={!picked || picked > today}
          onClick={() => {
            onAdd(picked);
            setPicked("");
          }}
        >
          Add date
        </button>
      </div>
    </div>
  );
}

function SoakTimer({ seconds, label }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          setRunning(false);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const done = left === 0;

  return (
    <div className="pl-timer">
      <div>
        <p className="pl-timerLabel">{done ? "Soak done — drain the pot fully" : label}</p>
        <p className={done ? "pl-clock pl-clockDone" : "pl-clock"}>
          {mm}:{ss}
        </p>
      </div>
      <div className="pl-timerBtns">
        {!done && (
          <button className="pl-ghost" onClick={() => setRunning(!running)}>
            {running ? "Pause" : left === seconds ? "Start soak" : "Resume"}
          </button>
        )}
        {(done || left !== seconds) && (
          <button
            className="pl-ghost"
            onClick={() => {
              setRunning(false);
              setLeft(seconds);
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function Strip({ history, interval, today }) {
  const days = [];
  const watered = new Set(history.map((h) => h.date));
  for (let i = 20; i >= 0; i--) {
    const d = dateKey(new Date(fromKey(today) - i * DAY));
    days.push({ d, hit: watered.has(d) });
  }
  return (
    <div className="pl-strip">
      <p className="pl-stripLabel">Last 21 days — a mark is a logged watering</p>
      <div className="pl-stripRow">
        {days.map(({ d, hit }) => (
          <span key={d} className={hit ? "pl-tick pl-tickOn" : "pl-tick"} title={fmt(d)} />
        ))}
      </div>
      <p className="pl-stripLabel">Gaps wider than {interval} days mean a round got missed.</p>
    </div>
  );
}

function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

      .pl-root {
        min-height: 100vh;
        background:
          radial-gradient(120% 80% at 50% -10%, #1B3630 0%, ${PALETTE.ink} 55%),
          ${PALETTE.ink};
        color: ${PALETTE.mist};
        font-family: 'IBM Plex Sans', system-ui, sans-serif;
        font-size: 16px;
        line-height: 1.5;
        padding: 26px 16px 64px;
        -webkit-text-size-adjust: 100%;
        box-sizing: border-box;
      }
      .pl-head { max-width: 620px; margin: 0 auto 22px; }
      .pl-eyebrow {
        font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase;
        color: ${PALETTE.quiet}; margin: 0 0 8px;
      }
      .pl-display {
        font-family: 'Fraunces', Georgia, serif;
        font-weight: 600; font-size: 34px; line-height: 1.12;
        margin: 0 0 10px; color: #F2FBF4;
      }
      .pl-note { font-size: 15.5px; line-height: 1.55; color: ${PALETTE.quiet}; margin: 0; }
      .pl-status {
        max-width: 620px; margin: 0 auto 16px; font-size: 15px;
        color: ${PALETTE.parch}; border-left: 2px solid ${PALETTE.parch}; padding-left: 10px;
        display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
      }
      .pl-statusText { margin: 0; line-height: 1.5; }
      .pl-list { max-width: 620px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
      .pl-card {
        background: ${PALETTE.panel};
        border: 1px solid ${PALETTE.panelEdge};
        border-radius: 14px;
        padding: 18px 16px;
      }
      .pl-cardTop {
        display: flex; justify-content: space-between; align-items: flex-start;
        gap: 10px; flex-wrap: wrap;
      }
      .pl-name {
        font-family: 'Fraunces', Georgia, serif; font-weight: 600;
        font-size: 22px; line-height: 1.2; margin: 0 0 4px; color: #F2FBF4;
      }
      .pl-detail { font-size: 14.5px; color: ${PALETTE.quiet}; margin: 0; }
      .pl-aka { font-size: 15px; color: ${PALETTE.mist}; margin: 0 0 3px; }
      .pl-latin {
        font-size: 14px; color: ${PALETTE.quiet}; font-style: italic;
        margin: 0 0 5px;
      }
      .pl-tag {
        font-size: 13px; letter-spacing: 0.07em; text-transform: uppercase;
        border: 1px solid; border-radius: 999px; padding: 6px 11px; white-space: nowrap;
      }
      .pl-meter {
        height: 9px; border-radius: 999px; background: #0A1614;
        margin: 16px 0 12px; overflow: hidden;
      }
      .pl-meterFill { height: 100%; border-radius: 999px; transition: width 400ms ease; }
      .pl-meta {
        font-size: 15px; color: ${PALETTE.mist}; display: flex;
        flex-wrap: wrap; gap: 7px; align-items: baseline;
      }
      .pl-dot { color: ${PALETTE.panelEdge}; }
      .pl-water { color: ${PALETTE.fresh}; }
      .pl-warn { color: ${PALETTE.parch}; font-weight: 600; }
      .pl-check { font-size: 15px; line-height: 1.5; color: ${PALETTE.quiet}; margin: 10px 0 0; }
      .pl-timer {
        margin-top: 12px; padding: 10px 12px; border-radius: 10px;
        background: #0F211E; border: 1px solid ${PALETTE.panelEdge};
        display: flex; justify-content: space-between; align-items: center; gap: 10px;
      }
      .pl-timerLabel { font-size: 12.5px; letter-spacing: 0.09em; text-transform: uppercase; color: ${PALETTE.quiet}; margin: 0 0 3px; }
      .pl-clock {
        font-family: 'Fraunces', Georgia, serif; font-size: 30px;
        font-variant-numeric: tabular-nums; margin: 0; color: #F2FBF4;
      }
      .pl-clockDone { color: ${PALETTE.fresh}; }
      .pl-timerBtns { display: flex; gap: 6px; flex-shrink: 0; }
      .pl-timerBtns .pl-ghost { padding: 11px 12px; font-size: 14px; }
      .pl-actions { display: flex; gap: 8px; margin-top: 14px; }
      .pl-primary {
        flex: 1; background: ${PALETTE.moss}; color: #06110E; border: none;
        border-radius: 10px; padding: 15px 16px; font-size: 16.5px; font-weight: 600;
        font-family: inherit; cursor: pointer; min-height: 50px;
      }
      .pl-primary:hover { background: ${PALETTE.fresh}; }
      .pl-done {
        flex: 1; background: transparent; color: ${PALETTE.fresh};
        border: 1px solid ${PALETTE.panelEdge}; border-radius: 10px;
        padding: 15px 16px; font-size: 15px; font-family: inherit; cursor: pointer; min-height: 50px;
      }
      .pl-ghost {
        background: transparent; color: ${PALETTE.quiet};
        border: 1px solid ${PALETTE.panelEdge}; border-radius: 10px;
        padding: 15px 16px; font-size: 15px; font-family: inherit; cursor: pointer; min-height: 50px;
      }
      .pl-ghost:hover { color: ${PALETTE.mist}; }
      .pl-primary:focus-visible, .pl-ghost:focus-visible, .pl-done:focus-visible, .pl-input:focus-visible {
        outline: 2px solid ${PALETTE.fresh}; outline-offset: 2px;
      }
      .pl-history { margin-top: 14px; border-top: 1px solid ${PALETTE.panelEdge}; padding-top: 12px; }
      .pl-strip { margin-bottom: 10px; }
      .pl-stripLabel { font-size: 13px; line-height: 1.45; color: ${PALETTE.quiet}; margin: 0 0 8px; }
      .pl-stripRow { display: flex; gap: 3px; margin-bottom: 6px; }
      .pl-tick { flex: 1; height: 26px; border-radius: 3px; background: #0A1614; }
      .pl-tickOn { background: ${PALETTE.moss}; }
      .pl-entries { list-style: none; padding: 0; margin: 0; }
      .pl-entries li {
        display: flex; justify-content: space-between; font-size: 15.5px;
        padding: 9px 0; border-bottom: 1px solid #0F201D;
      }
      .pl-by { color: ${PALETTE.quiet}; }
      .pl-backdate {
        margin: 4px 0 14px; padding: 12px; border-radius: 10px;
        background: #0F211E; border: 1px solid ${PALETTE.panelEdge};
      }
      .pl-quickRow { display: flex; gap: 8px; margin-top: 8px; }
      .pl-quick { flex: 1; padding: 12px 10px; font-size: 14px; min-height: 46px; }
      .pl-quick:disabled { opacity: 0.45; cursor: default; }
      .pl-date {
        flex: 1; background: ${PALETTE.panel}; border: 1px solid ${PALETTE.panelEdge};
        border-radius: 10px; padding: 12px; color: ${PALETTE.mist};
        font-size: 15px; font-family: inherit; min-height: 46px;
      }
      .pl-entryRight { display: flex; align-items: center; gap: 10px; }
      .pl-remove {
        background: transparent; border: none; color: ${PALETTE.quiet};
        font-size: 22px; line-height: 1; cursor: pointer; padding: 0 4px;
      }
      .pl-remove:hover { color: ${PALETTE.dry}; }
      .pl-empty { font-size: 15px; line-height: 1.5; color: ${PALETTE.quiet}; margin: 0; }
      .pl-gate { max-width: 380px; margin: 12vh auto 0; }
      .pl-input {
        width: 100%; box-sizing: border-box; margin: 16px 0 10px;
        background: ${PALETTE.panel}; border: 1px solid ${PALETTE.panelEdge};
        border-radius: 10px; padding: 15px; color: ${PALETTE.mist};
        font-size: 16.5px; font-family: inherit;
      }
      .pl-gate .pl-primary { width: 100%; }
      .pl-foot {
        max-width: 620px; margin: 26px auto 0; display: flex;
        justify-content: space-between; align-items: center; gap: 12px;
      }
      .pl-foot p { font-size: 13.5px; line-height: 1.5; color: ${PALETTE.quiet}; margin: 0; }
      @media (max-width: 430px) {
        .pl-display { font-size: 30px; }
        .pl-actions { flex-direction: column; }
        .pl-actions .pl-primary, .pl-actions .pl-ghost, .pl-actions .pl-done { width: 100%; }
        .pl-timer { flex-direction: column; align-items: flex-start; }
        .pl-timerBtns { width: 100%; }
        .pl-timerBtns .pl-ghost { flex: 1; }
        .pl-foot { flex-direction: column; align-items: flex-start; }
        .pl-foot .pl-ghost { width: 100%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .pl-meterFill { transition: none; }
      }
    `}</style>
  );
}
