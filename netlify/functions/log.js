import { getStore } from "@netlify/blobs";

// Strong consistency: a watering logged by one housemate is visible to the
// next person immediately, rather than after eventual-consistency propagation.
const store = () => getStore({ name: "plant-log", consistency: "strong" });

const KEY = "entries";

// Identity of a single log entry: the same day can hold both a watering and a
// "still damp" check-in, and they are different records.
const entryKey = (e) => `${e.date}|${e.checked ? "c" : "w"}`;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export default async function handler(req) {
  try {
    if (req.method === "GET") {
      const data = await store().get(KEY, { type: "json" });
      return json(data || {});
    }

    if (req.method === "PUT") {
      const incoming = await req.json();

      if (incoming === null || typeof incoming !== "object" || Array.isArray(incoming)) {
        return json({ error: "Expected an object of group entries" }, 400);
      }

      // Merge rather than overwrite: if two people log at once, last-write-wins
      // on the whole blob would silently drop one of them.
      const current = (await store().get(KEY, { type: "json" })) || {};
      const merged = { ...current };

      for (const [groupId, entries] of Object.entries(incoming)) {
        // Keys starting with "_" are house-wide settings (e.g. _season),
        // not entry lists: last write wins.
        if (groupId.startsWith("_")) {
          merged[groupId] = entries;
          continue;
        }
        if (!Array.isArray(entries)) continue;
        // A watering and a check-in can share a date, so key on both or the
        // two collapse into one and a real watering is lost.
        const byKey = new Map();
        for (const e of [...(current[groupId] || []), ...entries]) {
          if (e && typeof e.date === "string") byKey.set(entryKey(e), e);
        }
        merged[groupId] = [...byKey.values()]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .slice(0, 60);
      }

      // A group present in the request but absent from it entirely means a
      // deletion; honour removals by trusting the client's list for that group.
      for (const groupId of Object.keys(incoming)) {
        if (groupId.startsWith("_")) continue;
        if (!Array.isArray(incoming[groupId])) continue;
        const clientKeys = new Set(incoming[groupId].map(entryKey));
        const serverOnly = (current[groupId] || []).filter(
          (e) => !clientKeys.has(entryKey(e))
        );
        // Keep server-only entries unless the client explicitly shrank the list
        // for this group by exactly the entries it removed this session.
        if (serverOnly.length && clientKeys.size < (current[groupId] || []).length) {
          merged[groupId] = (incoming[groupId] || [])
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 60);
        }
      }

      await store().setJSON(KEY, merged);
      return json(merged);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) }, 500);
  }
}

export const config = { path: "/api/log" };
