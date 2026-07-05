# warddirectory

A web app for maintaining a printed church "ward" directory. It stores members'
information (name, photo, phone, email, apartment, callings) and generates a
print-ready PDF booklet from LaTeX templates, ordered **by apartment** or
**alphabetically**.

I built it because the clerk before me was assembling this booklet by hand in
PowerPoint. I knew LaTeX, so I wrote something better. A useful side effect: it
orders people by *apartment* instead of by *family*, which my church's official
system can't do — handy for a congregation of young single adults where nobody
is grouped into a family unit.

## Try the demo (one command)

The whole stack — the app, a MongoDB database, and a LaTeX toolchain for the PDF
booklet — runs in Docker with sample data already loaded. You need
[Docker](https://docs.docker.com/get-docker/) installed; nothing else.

```bash
docker compose up --build
```

Then open **http://localhost:3000** and log in with one of the demo accounts:

| Role | Email | Password | What you can do |
|------|-------|----------|-----------------|
| **Clerk** (full access) | `clerk@warddir.demo` | `demo1234` | Everything: add/edit/delete members, upload photos, generate the PDF booklet |
| **Member** (read-only) | `member@warddir.demo` | `demo1234` | Browse the directory as a regular member |

The login is two steps: enter the email, click **Continue**, then enter the
password.

### What to look at

- **Apartments** in the left sidebar — the core feature: members grouped by
  apartment instead of by family.
- **Bishopric** and **Leadership** tabs — special views (the Bishopric view also
  shows addresses).
- **Download Current Booklet** (right sidebar) — the generated PDF directory. As
  the **Clerk**, use **Generate Booklet** first to build a fresh one, and try
  toggling *By Apartment* vs *Alphabetically*.
- As the **Clerk**, hover a member card to reveal **Edit / Delete**, and try the
  **Add member** and **Add Batch** tools.

The database is **reseeded from scratch every time the app container starts**,
so you can freely edit, delete, and experiment — a restart (`docker compose
restart app`) restores the sample ward.

To stop and wipe everything (including the database volume):

```bash
docker compose down -v
```

## Operating the demo

- **Login analytics.** Every successful login is recorded (in its own MongoDB
  collection that survives reseeds). View a summary — total logins, unique
  visitors, and a per-account breakdown — at:

  ```
  GET /api/stats?token=<STATS_TOKEN>
  ```

  `STATS_TOKEN` is set in `docker-compose.yml`; **change it from the default
  before exposing the demo.**

- **Resource limits.** The app and database have CPU/memory/pid caps in
  `docker-compose.yml` so a burst of booklet generation or uploads can't starve
  the host. For public exposure, also add a rate-limit rule at your Cloudflare
  tunnel and schedule an occasional `docker compose restart app` (which
  reseeds) to keep the demo pristine.

## Running it for real (without Docker)

Clone the repo and run `npm install`. You'll need a MongoDB instance and
`pdflatex` installed on the system. Configuration and credentials go in a
`.env` file inside `server/` — see [`server/.env.example`](server/.env.example)
for the required variables. Start it with `node server/server.js` (run from the
`server/` directory so the relative `../public` and `../photos` paths resolve).

## How it's built

- **Backend:** Node.js + Express, MongoDB via Mongoose, JWT-cookie auth,
  bcrypt-hashed passwords, Multer for photo uploads.
- **Frontend:** a Vue 2 single-page app (`public/`).
- **Booklet:** LaTeX templates in `server/booklet_pieces/` are filled with member
  data and compiled to PDF with `pdflatex` (imposed two-up for printing via
  `pdfpages`).

## Status

This started as a personal tool and is now packaged as a portfolio demo. It is
not in official production, and some dependencies are from ~2020. If you find
bugs or security issues, I'd love to hear about them — I'm always looking to
improve.
