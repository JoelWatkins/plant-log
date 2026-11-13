import React, { useState, useEffect } from "react";

// Each group carries its summer instruction plus whatever a cooler season
// changes. The card shows the season's own wording — never the summer line
// followed by a correction to it.
const GROUPS = [
  {
    id: "seed-planters",
    name: "Seed planters",
    latin: "wildflower mixes",
    aka: "Save the Bees + Bring Home the Butterflies",
    detail: "3 troughs on the patio, sown 8/30/26",
    outdoor: true,
    interval: 1,
    water: "tap",
    check: "surface must never dry out — reseed round",
    fall: {
      interval: 4,
      check: "seedlings are established — water when the top inch is dry",
    },
    winter: {
      interval: 10,
      check: "rain usually covers these — water only if two weeks pass dry",
    },
  },
  {
    id: "venus-flytrap",
    name: "Venus flytrap",
    latin: "Dionaea muscipula",
    aka: "flytrap",
    detail: "terrarium cup, patio",
    outdoor: true,
    interval: 2,
    water: "distilled",
    check: "keep soil damp — stand the cup in 1/2 inch of distilled water",
    fall: {
      interval: 3,
      check: "growth is slowing — keep damp, but drop the standing water to a shallow film",
    },
    winter: {
      interval: 5,
      check: "dormant — barely damp, no standing water, and leave it outside for the cold",
    },
  },
  {
    id: "sweet-potato-vine",
    name: "Sweet potato vine",
    latin: "Ipomoea batatas",
    aka: "ornamental sweet potato, tuber vine",
    detail: "potted, patio",
    outdoor: true,
    interval: 2,
    water: "tap",
    check: "top 1 inch dry — wilts fast, recovers fast",
    fall: { interval: 4, check: "top 1 inch dry — it drinks less as growth slows" },
    winter: {
      absent: true,
      check: "gone for the season after the first cold snap — nothing to water; the tuber may resprout in spring",
    },
  },
  {
    id: "fuchsia",
    name: "Fuchsia + ivy",
    latin: "Fuchsia sp. with Hedera helix",
    aka: "lady's eardrops, English ivy",
    detail: "sharing one pot",
    outdoor: true,
    interval: [2, 3],
    water: "tap",
    check: "never let it dry out — water for the fuchsia, the ivy will cope",
    fall: { interval: [4, 5], check: "top inch dry — the fuchsia still sets the pace" },
    winter: {
      interval: 7,
      check: "barely moist is enough while it rests — water only when the top inch is dry",
    },
  },
  {
    id: "outdoor-spiders",
    name: "Outdoor spider plants",
    latin: "Chlorophytum comosum",
    aka: "airplane plant, ribbon plant",
    detail: "2 pots on the patio",
    outdoor: true,
    interval: 4,
    water: "tap",
    check: "top 1 inch dry — top-water until it runs out the bottom",
    winter: {
      interval: 10,
      check: "top inch dry — check the pots after rain before you pour",
    },
  },
  {
    id: "tradescantia",
    name: "Tradescantia",
    latin: "Tradescantia zebrina",
    aka: "wandering dude, inch plant, silver inch",
    detail: "hanging, bedroom",
    interval: 6,
    water: "tap",
    check: "top 1 inch dry — bottom-soak the pot 30 min, then drain fully",
    soak: 1800,
    flushEvery: 5,
  },
  {
    id: "spider-indoor",
    name: "Curly spider plant",
    latin: "Chlorophytum comosum 'Bonnie'",
    aka: "spider ivy, airplane plant",
    detail: "hanging, bedroom window",
    interval: 8,
    water: "filtered",
    check: "top 1 inch dry — bottom-soak 20 min, then drain fully",
    soak: 1200,
    flushEvery: 4,
  },
  {
    id: "money-tree",
    name: "Money tree",
    latin: "Pachira aquatica",
    aka: "Malabar chestnut, braided money plant",
    detail: "office window",
    interval: 12,
    water: "tap",
    check: "top 2 inches dry",
    winter: { check: "top 3 inches dry — it uses very little while the light is low" },
  },
  {
    id: "string-of-hearts",
    name: "String of hearts",
    latin: "Ceropegia woodii",
    aka: "rosary vine, chain of hearts",
    detail: "hanging, bedroom",
    interval: 12,
    water: "tap",
    check: "bone dry, then wait a day — bottom-soak 15 min, drain well",
    soak: 900,
    flushEvery: 5,
    winter: {
      check: "bone dry for several days first — a 10-minute soak is plenty",
      soak: 600,
    },
  },
  {
    id: "citrus",
    name: "Citrus trees",
    latin: "Citrus × limon, Citrus × sinensis",
    aka: "the lemon and the orange",
    detail: "back fence",
    outdoor: true,
    interval: 14,
    water: "hose",
    check: "deep soak at the drip line, 30 min",
    soak: 1800,
    winter: {
      resting: true,
      check: "rain covers these — don't water. Only if three weeks pass dry, give one deep soak.",
    },
  },
];

const SEASONS = [
  { id: "summer", label: "Summer", mult: 1 },
  { id: "fall", label: "Fall", mult: 1.5 },
  { id: "winter", label: "Winter", mult: 2 },
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
    if (!r.ok) {
      // Carry the server's own message through, so a failure says what broke
      // instead of just "couldn't save".
      let detail = "";
      try {
        const body = await r.json();
        if (body && body.error) detail = `: ${body.error}`;
      } catch {
        /* not JSON */
      }
      throw new Error(`saving failed (${r.status})${detail}`);
    }
    return r.json();
  },
};

const hasStorage = () => typeof fetch === "function";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A learned interval can stretch to at most double the planned one and shrink
// to at most half, so a run of odd readings can never strand a plant.
const absentOrResting = (r, season) =>
  r.absent ? `gone for ${season}` : `resting for ${season}`;

const clampAdjust = (n, base) =>
  Math.max(-Math.floor(base / 2), Math.min(base, Math.round(n || 0)));

// Short physical confirmation that a tap registered.
function confirmBlip(kind) {
  try {
    if (navigator.vibrate) navigator.vibrate(kind === "watered" ? [35, 60, 35] : 30);
  } catch {
    /* no vibration */
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = kind === "watered" ? [660, 880] : [520];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.25);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio blocked */
  }
}

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
  const [season, setSeason] = useState("summer");
  // After a tap, hold the list order and show a confirmation, so the card you
  // touched doesn't vanish out from under your finger as the list re-sorts.
  const [flash, setFlash] = useState(null);
  const [rainOpen, setRainOpen] = useState(false);
  const [rainPick, setRainPick] = useState({});
  const [rainDay, setRainDay] = useState("today");
  const [rainFlash, setRainFlash] = useState("");
  const rainTimer = React.useRef(null);
  const [frozenOrder, setFrozenOrder] = useState(null);
  const orderRef = React.useRef([]);
  const flashTimer = React.useRef(null);

  useEffect(() => () => {
    clearTimeout(flashTimer.current);
    clearTimeout(rainTimer.current);
  }, []);

  // Pull in other people's waterings periodically and on refocus, so two
  // housemates with the app open don't work from stale counts.
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      if (document.hidden) return;
      try {
        const fresh = await api.get();
        if (!cancelled) {
          if (fresh && fresh._season) setSeason(fresh._season);
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
      if (entries && entries._season) setSeason(entries._season);
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
    } catch (e) {
      setOffline(true);
      setStatus(e && e.message ? e.message : "");
    } finally {
      setSyncing(false);
    }
  }

  async function logCheck(groupId, row) {
    const next = { ...log };
    const prior = (next[groupId] || []).filter(
      (e) => !(e.checked && e.date === today)
    );
    // Still damp on the day it came due means the interval is running short.
    // Nudge it out a day; the clamp keeps this from drifting forever.
    if (row && row.remaining <= 0 && !row.checkedToday) {
      const current = (next._adjust || {})[groupId] || 0;
      next._adjust = {
        ...(next._adjust || {}),
        [groupId]: clampAdjust(current + 1, row.base),
      };
    }
    confirmAction(groupId, "checked");
    next[groupId] = [{ date: today, by: who, checked: true }, ...prior]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 60);
    setLog(next);
    await persist(next);
  }

  async function logWatering(groupId, when, row, fromRain) {
    if (!when) confirmAction(groupId, "watered");
    const stamp = { date: when || today, by: who };
    const next = { ...log };
    // Watered early is the opposite signal: it dried out ahead of schedule.
    // Rain is not that signal — it falls on its own schedule, not the plant's.
    if (!when && row && row.remaining > 0 && !fromRain) {
      const current = (next._adjust || {})[groupId] || 0;
      next._adjust = {
        ...(next._adjust || {}),
        [groupId]: clampAdjust(current - 1, row.base),
      };
    }
    const prior = (next[groupId] || []).filter(
      (e) => !(e.date === stamp.date && !e.checked) && !(e.checked && e.date === stamp.date)
    );
    next[groupId] = [stamp, ...prior]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 40);
    setLog(next);
    await persist(next);
  }

  async function undo(groupId, date) {
    const next = { ...log };
    next[groupId] = (next[groupId] || []).filter(
      (e) => !(e.date === date && !e.checked)
    );
    setLog(next);
    await persist(next);
  }

  async function undoEntry(groupId, entry) {
    const next = { ...log };
    next[groupId] = (next[groupId] || []).filter(
      (e) => !(e.date === entry.date && !!e.checked === !!entry.checked)
    );
    setLog(next);
    await persist(next);
  }

  function confirmAction(groupId, kind) {
    setFrozenOrder(orderRef.current);
    setFlash({ id: groupId, kind });
    confirmBlip(kind);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setFlash(null);
      setFrozenOrder(null);
    }, 2600);
  }

  async function chooseSeason(id) {
    setSeason(id);
    const next = { ...log, _season: id };
    setLog(next);
    await persist(next);
  }

  function openRain(rows) {
    const pick = {};
    for (const r of rows) {
      if (r.outdoor) pick[r.id] = !r.absent;
    }
    setRainPick(pick);
    setRainDay("today");
    setRainOpen(true);
  }

  async function logRain(rows) {
    const date =
      rainDay === "yesterday" ? dateKey(new Date(fromKey(today) - DAY)) : today;
    const chosen = rows.filter((r) => r.outdoor && rainPick[r.id]);
    if (!chosen.length) {
      setRainOpen(false);
      return;
    }

    const next = { ...log };
    for (const r of chosen) {
      const prior = (next[r.id] || []).filter((e) => !(e.date === date && !e.checked));
      next[r.id] = [{ date, by: who, rain: true }, ...prior]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 60);
    }

    // Hold the order while the confirmation shows, as a single tap can move
    // half the list at once.
    setFrozenOrder(orderRef.current);
    setRainOpen(false);
    setLog(next);
    confirmBlip("watered");
    setRainFlash(
      `Rain logged for ${chosen.length} outdoor ${
        chosen.length === 1 ? "group" : "groups"
      }${rainDay === "yesterday" ? " (yesterday)" : ""}.`
    );
    clearTimeout(rainTimer.current);
    rainTimer.current = setTimeout(() => {
      setRainFlash("");
      setFrozenOrder(null);
    }, 3200);

    await persist(next);
  }

  async function resetAdjust(groupId) {
    const next = { ...log, _adjust: { ...(log._adjust || {}) } };
    delete next._adjust[groupId];
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

  const mult = (SEASONS.find((x) => x.id === season) || SEASONS[0]).mult;
  // Days added to (or taken off) a group's interval, learned from experience.
  const adjust = log._adjust || {};

  const rows = GROUPS.map((g) => {
    // The season's own entry replaces the summer wording outright, so a card
    // never shows a summer instruction with a correction stapled underneath.
    const sv = g[season] || {};
    const check = sv.check !== undefined ? sv.check : g.check;
    const soak = sv.soak !== undefined ? sv.soak : g.soak;
    // "absent" means the plant isn't there this season at all; "resting" just
    // means it's off the schedule. Both skip the countdown, but rain still
    // matters to a resting plant and means nothing to an absent one.
    const absent = !!sv.absent;
    const resting = absent || !!sv.resting;
    // A season that names its own interval means it outright; only a season
    // without one falls back to stretching the summer figure.
    const seasonInterval = sv.interval !== undefined ? sv.interval : null;
    const all = log[g.id] || [];
    // A check-in records that someone looked and the soil was still damp.
    // It never resets the watering clock or advances the flush count.
    const history = all.filter((e) => !e.checked);
    const checks = all.filter((e) => e.checked);
    const lastCheck = checks[0];
    const checkedToday = lastCheck && lastCheck.date === today;
    const last = history[0];
    const since = last ? daysBetween(last.date, today) : null;
    // An interval can be a single number or a repeating cycle, e.g. [2, 3].
    const source = seasonInterval !== null ? seasonInterval : g.interval;
    const cycle = Array.isArray(source) ? source : [source];
    const base = cycle[history.length % cycle.length];
    const adj = clampAdjust(adjust[g.id] || 0, base);
    const planned =
      seasonInterval !== null ? base : Math.round(base * mult);
    const interval = Math.max(1, planned + adj);
    const remaining = resting || since === null ? -1 : interval - since;
    // Bottom-watering concentrates minerals, so every Nth round is a top flush.
    const nextIsFlush = g.flushEvery
      ? (history.length + 1) % g.flushEvery === 0
      : false;
    const untilFlush = g.flushEvery
      ? g.flushEvery - ((history.length + 1) % g.flushEvery || g.flushEvery)
      : null;
    return {
      ...g, history, all, last, since, remaining, nextIsFlush, untilFlush,
      interval, cycle, base, lastCheck, checkedToday, adj,
      check, soak, resting, absent, planned,
    };
  }).sort((a, b) => {
    // A resting plant has nothing to do, so it sits below the live ones.
    if (a.resting !== b.resting) return a.resting ? 1 : -1;
    return a.remaining - b.remaining;
  });

  // Remember the natural order for the next tap, then apply the frozen one.
  orderRef.current = rows.map((r) => r.id);
  const display = frozenOrder
    ? [...rows].sort(
        (a, b) => frozenOrder.indexOf(a.id) - frozenOrder.indexOf(b.id)
      )
    : rows;

  // A group someone checked and found damp today is handled, not outstanding —
  // the cards already go quiet, so the header has to agree with them.
  const dueCount = rows.filter((r) => !r.resting && r.remaining <= 0 && !r.checkedToday).length;
  const dampCount = rows.filter((r) => !r.resting && r.remaining <= 0 && r.checkedToday).length;

  return (
    <>
      <Style />
      <div className="pl-root">
        <header className="pl-head">
          <p className="pl-eyebrow">
            {fromKey(today).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="pl-display">
            {dueCount > 0
              ? `${dueCount} ${dueCount === 1 ? "group needs" : "groups need"} water`
              : dampCount > 0
              ? "Nothing needs water"
              : "Everything's watered"}
          </h1>
          <p className="pl-note">
            Logged in as {who}. The bar shows how much of each plant's window is left — always finger-test before you pour.
          </p>
          {dampCount > 0 && (
            <p className="pl-note pl-dampNote">
              {dampCount === 1 ? "1 group was" : `${dampCount} groups were`} checked
              today and found still damp.
            </p>
          )}
        </header>

        <div className="pl-seasons" role="group" aria-label="Season">
          {SEASONS.map((x) => (
            <button
              key={x.id}
              className={x.id === season ? "pl-season pl-seasonOn" : "pl-season"}
              onClick={() => chooseSeason(x.id)}
            >
              {x.label}
            </button>
          ))}
        </div>
        {season !== "summer" && (
          <p className="pl-seasonNote">
            On the {season} schedule. Everyone sees this setting.
          </p>
        )}

        {rainFlash ? (
          <div className="pl-confirm pl-rainConfirm" role="status">
            <span className="pl-confirmMark">✓</span>
            <span>{rainFlash}</span>
          </div>
        ) : rainOpen ? (
          <div className="pl-rainPanel">
            <p className="pl-stripLabel">
              Which outdoor pots actually caught it? Anything under the eaves may
              have stayed dry.
            </p>
            {rows
              .filter((r) => r.outdoor)
              .map((r) => (
                <label key={r.id} className="pl-rainRow">
                  <input
                    type="checkbox"
                    checked={!!rainPick[r.id]}
                    onChange={(e) =>
                      setRainPick({ ...rainPick, [r.id]: e.target.checked })
                    }
                  />
                  <span>
                    {r.name}
                    <span className="pl-rainWhere">
                      {" "}
                      — {r.detail}
                      {r.absent ? ", not there now" : r.resting ? ", resting" : ""}
                    </span>
                  </span>
                </label>
              ))}
            <div className="pl-rainWhen">
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Overnight / yesterday" },
              ].map((d) => (
                <button
                  key={d.id}
                  className={d.id === rainDay ? "pl-season pl-seasonOn" : "pl-season"}
                  onClick={() => setRainDay(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="pl-rainActions">
              <button className="pl-primary" onClick={() => logRain(rows)}>
                Log the rain
              </button>
              <button className="pl-ghost" onClick={() => setRainOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="pl-rainBtn" onClick={() => openRain(rows)}>
            It rained — covers the {rows.filter((r) => r.outdoor).length} outdoor groups
          </button>
        )}

        {offline && (
          <div className="pl-status">
            <p className="pl-statusText">
              Can't reach the shared log right now. Your taps are recorded in this
              window, but housemates won't see them until the connection is back.
              {status ? ` (${status})` : ""}
            </p>
            <button className="pl-ghost" onClick={retrySync} disabled={syncing}>
              {syncing ? "Retrying…" : "Retry sync"}
            </button>
          </div>
        )}
        {!offline && status && <p className="pl-status">{status}</p>}

        <div className="pl-list">
          {display.map((r) => {
            const pct =
              r.since === null ? 0 : Math.max(0, Math.min(1, 1 - r.since / r.interval));
            const tone =
              r.resting
                ? PALETTE.quiet
                : r.checkedToday && r.remaining <= 0
                ? PALETTE.moss
                : r.remaining <= 0
                ? PALETTE.dry
                : pct < 0.35
                ? PALETTE.parch
                : PALETTE.moss;
            const wateredToday = r.last && r.last.date === today;
            const flashing = flash && flash.id === r.id;
            return (
              <section
                key={r.id}
                className={flashing ? "pl-card pl-cardFlash" : "pl-card"}
              >
                <div className="pl-cardTop">
                  <div>
                    <h2 className="pl-name">{r.name}</h2>
                    <p className="pl-aka">a.k.a. {r.aka}</p>
                    <p className="pl-latin">{r.latin}</p>
                    <p className="pl-detail">{r.detail}</p>
                  </div>
                  <span className="pl-tag" style={{ color: tone, borderColor: tone }}>
                    {r.resting
                      ? absentOrResting(r, season)
                      : r.checkedToday && r.remaining <= 0
                      ? "checked today"
                      : r.since === null
                      ? "no record"
                      : r.remaining > 0
                      ? `${r.remaining}d left`
                      : r.remaining === 0
                      ? "due today"
                      : `${Math.abs(r.remaining)}d overdue`}
                  </span>
                </div>

                {!r.resting && (
                <div className="pl-meter" aria-hidden="true">
                  <div className="pl-meterFill" style={{ width: `${pct * 100}%`, background: tone }} />
                </div>
                )}

                <div className="pl-meta">
                  <span>
                    {r.last
                      ? `Last ${r.last.rain ? "rained on" : "watered"} ${
                          r.since === 0 ? "today" : r.since === 1 ? "yesterday" : `${r.since} days ago`
                        }${r.last.rain ? "" : r.last.by ? ` by ${r.last.by}` : ""}`
                      : "Never logged"}
                  </span>
                  <span className="pl-dot">·</span>
                  {r.resting ? (
                    <span>no watering this season</span>
                  ) : (
                    <span>
                      {r.cycle.length > 1
                        ? `every ${r.cycle.join("–")} days (${r.interval} this round)`
                        : `every ${r.interval} days`}
                      {r.adj !== 0 && (
                        <span className="pl-learned">
                          {" "}
                          {r.adj > 0 ? `+${r.adj}` : r.adj} learned
                        </span>
                      )}
                    </span>
                  )}
                  <span className="pl-dot">·</span>
                  <span className={r.water === "distilled" ? "pl-water pl-warn" : "pl-water"}>{r.water === "distilled"
                      ? "DISTILLED OR RAINWATER ONLY — tap water kills it"
                      : r.water === "filtered"
                      ? "filtered water only"
                      : r.water === "hose"
                      ? "hose, deep soak"
                      : "tap is fine"}</span>
                </div>

                {r.lastCheck && (
                  <p className="pl-checkedLine">
                    {r.checkedToday
                      ? `Checked today by ${r.lastCheck.by || "someone"} — soil still damp`
                      : `Last checked ${fmt(r.lastCheck.date)} by ${r.lastCheck.by || "someone"}`}
                  </p>
                )}

                <p className="pl-check">Check: {r.check}</p>

                {r.flushEvery && (
                  r.nextIsFlush ? (
                    <p className="pl-flush">
                      Flush this round — top-water thoroughly until it runs out the
                      bottom, and skip the soak. Clears mineral buildup.
                    </p>
                  ) : (
                    <p className="pl-flushSoon">
                      Top flush due in {r.untilFlush === 0 ? "1" : r.untilFlush + 1}{" "}
                      {r.untilFlush === 0 ? "watering" : "waterings"}
                    </p>
                  )
                )}

                {r.soak && !r.resting && !r.nextIsFlush && (
                  <SoakTimer
                    id={r.id}
                    seconds={r.soak}
                    label={`${Math.round(r.soak / 60)}-minute soak`}
                  />
                )}

                {flashing ? (
                  <div className="pl-confirm" role="status">
                    <span className="pl-confirmMark">✓</span>
                    <span>
                      {flash.kind === "watered"
                        ? `Watered — logged for ${who}`
                        : `Checked — noted as still damp`}
                    </span>
                  </div>
                ) : (
                <div className="pl-actions">
                  <button
                    className={wateredToday || r.resting ? "pl-done" : "pl-primary"}
                    onClick={() =>
                      wateredToday ? undo(r.id, r.last.date) : logWatering(r.id, null, r)
                    }
                  >
                    {wateredToday
                      ? `Watered today by ${r.last.by || "someone"} — undo`
                      : r.resting
                      ? "Log a watering anyway"
                      : "I watered this"}
                  </button>
                  {!wateredToday && !r.resting && (
                    <button
                      className="pl-ghost"
                      onClick={() => logCheck(r.id, r)}
                      disabled={r.checkedToday}
                    >
                      {r.checkedToday ? "Still damp ✓" : "Still damp"}
                    </button>
                  )}
                  <button className="pl-ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    {open === r.id ? "Hide history" : "History"}
                  </button>
                </div>
                )}

                {open === r.id && (
                  <div className="pl-history">
                    <Strip history={r.history} interval={r.interval} today={today} />
                    {r.adj !== 0 && (
                      <div className="pl-learnedBox">
                        <p className="pl-stripLabel">
                          Planned every {Math.max(1, r.planned)} days, now every {r.interval}.
                          {r.adj > 0
                            ? " Stretched because it kept coming up still damp."
                            : " Pulled in because it kept getting watered early."}
                        </p>
                        <button className="pl-ghost pl-quick" onClick={() => resetAdjust(r.id)}>
                          Reset to {Math.max(1, r.planned)} days
                        </button>
                      </div>
                    )}
                    <Backdate
                      today={today}
                      existing={r.history.map((e) => e.date)}
                      onAdd={(d) => logWatering(r.id, d)}
                    />
                    {r.history.length === 0 ? (
                      <p className="pl-empty">Nothing logged yet. The first watering you record starts the clock.</p>
                    ) : (
                      <ul className="pl-entries">
                        {r.all.slice(0, 10).map((e) => (
                          <li key={`${e.date}-${e.checked ? "c" : "w"}`}>
                            <span>
                              {fmt(e.date)}
                              {e.checked && <span className="pl-tagSmall">checked</span>}
                              {e.rain && <span className="pl-tagSmall">rain</span>}
                            </span>
                            <span className="pl-entryRight">
                              <span className="pl-by">{e.by || "unsigned"}</span>
                              <button
                                className="pl-remove"
                                onClick={() => undoEntry(r.id, e)}
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

function SoakTimer({ seconds, label, id }) {
  const [deadline, setDeadline] = useState(null);
  const [left, setLeft] = useState(seconds);
  const [rang, setRang] = useState(false);

  const storeKey = `soak:${id}`;

  // Restore a soak that was running when the app was closed or backgrounded.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) {
        const at = Number(saved);
        if (at > Date.now()) setDeadline(at);
        else localStorage.removeItem(storeKey);
      }
    } catch {
      /* storage unavailable */
    }
  }, [storeKey]);

  // Derive remaining time from a fixed end time, so background throttling
  // and a locked screen don't slow the countdown down.
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) setRang(true);
    };
    tick();
    const t = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline]);

  // Alert when it lands: vibrate, then a short tone pair.
  useEffect(() => {
    if (!rang) return;
    try {
      localStorage.removeItem(storeKey);
    } catch {
      /* ignore */
    }
    try {
      if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 600]);
    } catch {
      /* vibration unsupported */
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const beep = (at, freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
        gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + at);
        osc.stop(ctx.currentTime + at + 0.55);
      };
      [0, 0.7, 1.4].forEach((at) => {
        beep(at, 880);
        beep(at + 0.25, 660);
      });
      setTimeout(() => ctx.close(), 3000);
    } catch {
      /* audio blocked */
    }
  }, [rang, storeKey]);

  const start = () => {
    const at = Date.now() + seconds * 1000;
    setDeadline(at);
    setRang(false);
    try {
      localStorage.setItem(storeKey, String(at));
    } catch {
      /* ignore */
    }
    // Unlock audio on this user gesture so the alert can play later.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume();
        setTimeout(() => ctx.close(), 500);
      }
    } catch {
      /* ignore */
    }
  };

  const reset = () => {
    setDeadline(null);
    setLeft(seconds);
    setRang(false);
    try {
      localStorage.removeItem(storeKey);
    } catch {
      /* ignore */
    }
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const done = deadline !== null && left === 0;
  const running = deadline !== null && left > 0;

  return (
    <div className="pl-timer">
      <div>
        <p className="pl-timerLabel">
          {done ? "Soak done — drain the pot fully" : label}
        </p>
        <p className={done ? "pl-clock pl-clockDone" : "pl-clock"}>
          {mm}:{ss}
        </p>
        {running && <p className="pl-timerHint">Keeps counting if you lock the screen</p>}
      </div>
      <div className="pl-timerBtns">
        {!running && !done && (
          <button className="pl-ghost" onClick={start}>
            Start soak
          </button>
        )}
        {(running || done) && (
          <button className="pl-ghost" onClick={reset}>
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
      .pl-flush {
        font-size: 14.5px; line-height: 1.5; color: ${PALETTE.parch};
        border-left: 2px solid ${PALETTE.parch}; padding-left: 10px;
        margin: 10px 0 0;
      }
      .pl-cardFlash {
        border-color: ${PALETTE.moss};
        animation: plFlash 2.6s ease-out;
      }
      @keyframes plFlash {
        0%   { background: ${PALETTE.moss}; }
        12%  { background: #1C4536; }
        100% { background: ${PALETTE.panel}; }
      }
      .pl-confirm {
        display: flex; align-items: center; gap: 10px;
        margin-top: 14px; padding: 15px 16px; min-height: 50px;
        border-radius: 10px; box-sizing: border-box;
        background: #16362B; border: 1px solid ${PALETTE.moss};
        color: ${PALETTE.fresh}; font-size: 15.5px; font-weight: 600;
        animation: plConfirmIn 220ms ease-out;
      }
      @keyframes plConfirmIn {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: none; }
      }
      .pl-confirmMark {
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; flex-shrink: 0; border-radius: 999px;
        background: ${PALETTE.moss}; color: #06110E; font-size: 16px;
      }
      .pl-rainBtn {
        display: block; width: 100%; max-width: 620px; margin: 0 auto 16px;
        box-sizing: border-box; background: ${PALETTE.panel};
        color: ${PALETTE.mist}; border: 1px solid ${PALETTE.panelEdge};
        border-radius: 10px; padding: 15px 16px; min-height: 50px;
        font-size: 16px; font-family: inherit; cursor: pointer;
      }
      .pl-rainBtn:hover { border-color: ${PALETTE.moss}; color: #F2FBF4; }
      .pl-rainPanel {
        max-width: 620px; margin: 0 auto 16px; padding: 16px;
        box-sizing: border-box; border-radius: 12px;
        background: ${PALETTE.panel}; border: 1px solid ${PALETTE.moss};
      }
      .pl-rainRow {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 10px 0; font-size: 15.5px; color: ${PALETTE.mist};
        border-bottom: 1px solid #0F201D; cursor: pointer;
      }
      .pl-rainRow input { width: 22px; height: 22px; flex-shrink: 0; margin: 0; }
      .pl-rainWhere { color: ${PALETTE.quiet}; font-size: 14px; }
      .pl-rainWhen { display: flex; gap: 6px; margin-top: 12px; }
      .pl-rainActions { display: flex; gap: 8px; margin-top: 12px; }
      .pl-rainActions .pl-primary { flex: 1; }
      .pl-rainConfirm { max-width: 620px; margin: 0 auto 16px; }
      .pl-seasons {
        max-width: 620px; margin: 0 auto 10px; display: flex; gap: 6px;
      }
      .pl-season {
        flex: 1; background: ${PALETTE.panel}; color: ${PALETTE.quiet};
        border: 1px solid ${PALETTE.panelEdge}; border-radius: 10px;
        padding: 12px 8px; font-size: 15px; font-family: inherit;
        cursor: pointer; min-height: 48px;
      }
      .pl-seasonOn {
        background: ${PALETTE.moss}; color: #06110E; font-weight: 600;
        border-color: ${PALETTE.moss};
      }
      .pl-dampNote { color: ${PALETTE.fresh}; margin-top: 6px; }
      .pl-seasonNote {
        max-width: 620px; margin: 0 auto 16px; font-size: 13.5px;
        color: ${PALETTE.quiet};
      }
      .pl-checkedLine {
        font-size: 14px; color: ${PALETTE.fresh}; margin: 8px 0 0;
      }
      .pl-tagSmall {
        font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
        color: ${PALETTE.quiet}; margin-left: 8px;
      }
      .pl-flushSoon { font-size: 13.5px; color: ${PALETTE.quiet}; margin: 8px 0 0; }
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
      .pl-timerHint { font-size: 12px; color: ${PALETTE.quiet}; margin: 4px 0 0; }
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
      .pl-learned { color: ${PALETTE.parch}; }
      .pl-learnedBox {
        margin: 0 0 12px; padding: 12px; border-radius: 10px;
        background: #0F211E; border: 1px solid ${PALETTE.panelEdge};
      }
      .pl-learnedBox .pl-quick { margin-top: 8px; width: 100%; }
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
        .pl-seasons { flex-wrap: wrap; }
        .pl-rainWhen { flex-direction: column; }
        .pl-rainActions { flex-direction: column; }
        .pl-rainActions .pl-primary, .pl-rainActions .pl-ghost { width: 100%; }
        .pl-timer { flex-direction: column; align-items: flex-start; }
        .pl-timerBtns { width: 100%; }
        .pl-timerBtns .pl-ghost { flex: 1; }
        .pl-foot { flex-direction: column; align-items: flex-start; }
        .pl-foot .pl-ghost { width: 100%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .pl-meterFill { transition: none; }
        .pl-cardFlash, .pl-confirm { animation: none; }
      }
    `}</style>
  );
}
