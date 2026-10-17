# Acquisition-Fit Lead Scorer

Live Demo: https://lead-scorer-xi.vercel.app/

Upload a CSV of small businesses. The tool merges duplicates, flags bad emails, scores each business from 0 to 100 for how well it fits an acquisition profile you set, and exports the ranked list. Every score comes with the reason for each factor.

I built it for the Caprae Capital pre-work challenge, with AI assistance (Claude). I can explain every part of it.

## Why

A search-fund buyer gets a long list of leads and has to decide who to call first. This ranks the list and says why. It does not find leads. It works on the data you give it.

## What it does

1. **Cleans.** Merges duplicates (same website, email, phone, or name plus city) and fills gaps from the merged rows.
2. **Checks emails.** Syntax, generic inboxes (`info@`, `sales@`), and optionally whether the domain has a mail server.
3. **Filters (optional).** "Only keep leads in these industries" drops everything else.
4. **Scores** against a profile you can edit, and shows points and a note per factor.
5. **Remembers runs.** Each run is saved and listed under Recent runs.
6. **Exports** the ranked CSV, best first.

### Scoring

| Factor | Max | Rewards |
|---|---|---|
| Succession | 20 | Owner age at or past the succession age (default 60) |
| Reachability | 20 | Named owner, non-generic email, phone, website |
| Industry | 15 | Matches a target industry |
| Team size | 15 | Employees inside your range (default 5 to 50) |
| Revenue | 10 | Inside your range (default $1M to $10M) |
| Track record | 10 | Years in business (default 10+) |
| Reputation | 10 | Rating and number of reviews |

Tiers: A is 80 and up, B is 60 to 79, C is below 60. A fact that is unknown earns 1 point for that factor, because a running business has some of everything. A fact that is known and clearly off-target earns 0, so unknown ranks just above known-bad and below anything that actually fits. Missing data also lowers the lead's confidence label (High, Medium, Low) instead of removing the lead.

## Run it

Node 20 or newer.

```bash
cd server && npm install && npm run dev     # http://localhost:4000
cd client && npm install && npm run dev     # http://localhost:5173
```

Open the UI, click **Use sample data**, then **Score leads**.

Tests: `npm test` in `server` and in `client`. Speed check: `npm run bench` in `server` scores 5,000 generated rows with no DNS checks.

## What is verified and what is not

Verified by running it:
- Server and client unit tests pass (pipeline, scoring, request handlers, CSV parsing).
- The API and UI work end to end with the in-memory store and the sample file.

Not verified:
- **MongoDB.** The Mongo store has never been tested against a real database here. To check it: set `MONGODB_URI` in `server/.env`, score a file, restart the server, and see if the run still appears under Recent runs.
- **Real DNS lookups** (the optional mail-server check) were not run against live domains in testing.
- **Deployment.** Nothing is hosted yet.

## Honest limits

- The weights are my reasoned guesses for a small-business search. They are not learned from real deals.
- The sample file is made up, and I built it to exercise the scoring. Good results on it say the code works, not that the scores are accurate.
- Owner age is rarely present in real lead data. Without it, the succession factor scores 1 out of 20.
- A mail-server check shows a domain can receive email, not that the mailbox exists.
- Duplicate detection treats a shared website or phone as the same business, so franchises could be merged wrongly.
- There is no AI model in the scoring. It is rules and arithmetic.
- Not built: accounts, rate limiting, CRM export, background jobs for very large files.

## Header logo

The header shows `client/public/caprae-logo.png` if the file exists and hides it if not. Add the file yourself; it is not included.

## Structure

```
client/   React 19 + Vite UI. Parses the CSV in the browser.
server/   Express API. src/pipeline has normalize, dedupe, validate, score, csv.
          src/handlers.js holds the request logic; src/app.js is the HTTP wiring.
          src/store has a MongoDB store and an in-memory fallback.
sample-data/  Made-up leads (.example domains, 555-01xx phones).
```

Limits: 5,000 rows and 5 MB per request. MX lookups are cached for 24 hours, run 10 at a time with a 3-second timeout.

## Deploy (planned)

MongoDB Atlas free tier for the database, Render for the API (root `server`, start `npm start`, set `MONGODB_URI` and `CORS_ORIGIN`), Vercel for the UI (root `client`, set `VITE_API_URL`). Never commit `.env`.

## Privacy

The tool does not scrape and never sends email. You are responsible for sourcing leads lawfully and following rules like CAN-SPAM or GDPR. CSV export neutralises cells starting with `=`, `+`, `-` or `@`.
