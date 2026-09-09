import { getStore } from "@netlify/blobs";

// Strong consistency: a watering logged by one housemate is visible to the
// next person immediately, rather than after eventual-consistency propagation.
const store = () => getStore({ name: "plant-log", consistency: "strong" });

const KEY = "entries";
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
        if (!Array.isArray(entries)) continue;
        const byDate = new Map();
        for (const e of [...(current[groupId] || []), ...entries]) {
          if (e && typeof e.date === "string") byDate.set(e.date, e);
        }
        merged[groupId] = [...byDate.values()]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .slice(0, 60);
      }

      // A group present in the request but absent from it entirely means a
      // deletion; honour removals by trusting the client's list for that group.
      for (const groupId of Object.keys(incoming)) {
        const clientDates = new Set((incoming[groupId] || []).map((e) => e.date));
        const serverOnly = (current[groupId] || []).filter(
          (e) => !clientDates.has(e.date)
        );
        // Keep server-only entries unless the client explicitly shrank the list
        // for this group by exactly the entries it removed this session.
        if (incoming[groupId] && serverOnly.length && clientDates.size < (current[groupId] || []).length) {
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
