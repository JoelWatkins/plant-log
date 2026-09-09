# Household Plant Log

A shared watering log for the house. Everyone opens the same URL, sees how long
it's been since each group was watered, and taps once when they water something.

## What it does

- **When to water** — each group shows a draining bar plus a plain label
  ("3d left", "due today", "2d overdue"). The list sorts most-overdue first.
- **Whether someone already did it** — "Last watered 2 days ago by Amy" on every
  group, updated for everyone.
- **Whether a date got missed** — the History panel shows a 21-day strip; a gap
  wider than the interval means a round was skipped.
- **Backdating** — Yesterday / 2 days ago buttons, plus a date picker for
  anything further back.
- **Soak timers** — 30-minute countdowns on the inch plant and the citrus.

## Deploying

You need a GitHub account and a Netlify account. Both free.

1. **Create a repo.** On GitHub, make a new empty repository (e.g. `plant-log`).
2. **Push this project into it:**

   ```bash
   cd plantlog
   git init
   git add .
   git commit -m "Household plant log"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/plant-log.git
   git push -u origin main
   ```

3. **Connect Netlify.** In Netlify: *Add new site* → *Import an existing
   project* → GitHub → pick the repo. The build settings come from
   `netlify.toml`, so accept the defaults and deploy.
4. **Rename the site** under *Site configuration → Change site name* to get a
   tidy URL like `slo-plant-log.netlify.app`.
5. **Send that URL to the house.** Everyone should add it to their home screen:
   Safari/Chrome → Share → *Add to Home Screen*. It then behaves like an app.

No environment variables and no database setup — Netlify Blobs is provisioned
automatically for the site.

## Making changes later

Edit `src/PlantLog.jsx` and push. Netlify rebuilds on every push to `main`, so
the live URL updates in a minute or two. No publish step to forget.

The plant list is the `GROUPS` array at the top of `src/PlantLog.jsx`. Each
entry looks like:

```js
{
  id: "calathea",            // stable — changing it orphans that group's history
  name: "Calathea",
  latin: "Calathea roseopicta",
  aka: "prayer plant, medallion",
  detail: "on the bar cabinet",
  interval: 6,               // days between waterings
  water: "filtered",         // "filtered" | "tap" | "hose"
  check: "top 1 inch dry",
  soak: 1800,                // optional: countdown in seconds
}
```

To add a plant, copy a line and change the fields. **Don't reuse or change an
existing `id`** — history is keyed to it.

## Running locally

```bash
npm install
npm run dev
```

`npm run dev` uses the Netlify CLI so the `/api/log` function works locally
(`npm i -g netlify-cli` if you don't have it). Plain `vite` would serve the UI
but every save would fail.

## How the data works

- The shared log lives in **Netlify Blobs** under the key `entries`, read and
  written through `netlify/functions/log.js` at `/api/log`.
- Reads use **strong consistency**, so a watering logged by one person is
  visible to the next immediately.
- Writes **merge** rather than overwrite, so two people logging at the same
  moment don't clobber each other.
- Open sessions re-poll every 30 seconds and on refocus.
- Your **name** is the only thing kept per-device, in `localStorage`.

There's no login. Anyone with the URL can log a watering — fine for a household,
but don't post the link publicly.

## Watering reference

| Group | Every | Water | Check |
|---|---|---|---|
| Seed planters (3 troughs, sown 8/30/26) | 1 day | tap | surface must never dry out |
| Sweet potato vine | 2 days | tap | top 1 inch dry, wilts fast in heat |
| Outdoor spider plants (2 pots) | 4 days | tap | top 1 inch dry |
| Calathea | 6 days | filtered | top 1 inch dry |
| Inch plant / tradescantia | 6 days | tap | bottom-soak 30 min, drain fully |
| Curly spider plant | 8 days | filtered | top 1 inch dry |
| Money tree | 12 days | tap | top 2 inches dry |
| String of hearts | 12 days | tap | bone dry, then wait a day |
| Citrus trees | 14 days | hose | deep soak at the drip line, 30 min |

The app is a prompt, not an order — always finger-test before pouring.
