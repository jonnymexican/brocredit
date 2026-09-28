# FriendCredit™ 🎖️

**Bureau of Friend Conduct** — a tongue-in-cheek social credit system for any friend group. Register your friends, file honors and offenses, and watch the leaderboard sort the Legends from the Pariahs.

**→ Use it live: [jonnymexican.github.io/brocredit](https://jonnymexican.github.io/brocredit/)**

## How it works

- **File a report** — pick a citizen, pick from 13 preset offenses/honors (*Flaked on plans* −15, *Helped a friend move* +20, *Texted 'on my way' from bed* −15…) or file a custom ±100 charge, with optional evidence and backdating
- **Official standings** — crowned leader, ranked list with seven rank tiers: 🐐 Legend (800+) → 🏅 Certified Good Friend → 👍 Solid Friend → 📋 On Probation → ❄️ Certified Flake → 🤡 Clown Behavior → 🚨 Enemy of the Friend Group (300)
- **The Record** — full transaction log with Honors/Offenses filters and redaction
- **Bureau Stats** — filing counts, net credit vs. damage, honor ratio, 7-day activity chart
- **Citizen registry** — add, rename, expel; or *Dissolve the Bureau* and start over
- Propaganda line included, rotating. ("Snitching is encouraged, comrade.")

Everyone starts at 700. Scores clamp to 300–850 — no single deed can fully destroy or crown a friend. Undo last filing, because the Bureau is benevolent.

## Tech

React 19 + Vite, no backend. All data lives in your browser's localStorage — each device holds its own ledger. 16 unit tests on the pure scoring/rank logic (`npm test`).

## Develop

```bash
npm install
npm run dev      # http://localhost:5190/brocredit/
npm test
npm run build
```

Deploys to GitHub Pages automatically on push to `main` via `.github/workflows/deploy.yml`.

---

Part of [the apps](https://jonnymexican.github.io/links/). 🤖 Built with Codebuff.
