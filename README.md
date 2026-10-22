# Acquisition-Fit Lead Scorer

**Turn raw business leads into a prioritized acquisition pipeline.**

A full-stack web application that cleans, deduplicates, validates, and scores business leads to help acquisition teams identify and prioritize potential opportunities.

Live Demo: https://lead-scorer-xi.vercel.app/

<img width="1919" height="986" alt="image" src="https://github.com/user-attachments/assets/0bc2cae3-f9d3-4dc2-b675-df9fad7c480f" />

---

## Overview

Finding potential acquisition targets is only the first step. Teams also need to organize business data, identify duplicate records, detect incomplete contact information, and prioritize which leads deserve further research.

Acquisition-Fit Lead Scorer addresses this workflow through a simple interface that processes lead data and assigns each lead a rule-based acquisition-fit score from 0–100, with explanations of the factors contributing to the result.

The goal is to make lead review more organized, transparent, and actionable.

## Key Features

- **Lead Scoring:** Assigns acquisition-fit scores using predefined rules and displays the contributing factors.
- **Data Cleaning:** Standardizes lead records to support more consistent analysis.
- **Duplicate Detection:** Identifies duplicate lead entries.
- **Email Validation:** Flags invalid email addresses for further review.
- **Industry Filtering:** Helps users narrow results by industry.
- **CSV Export:** Exports processed results for further analysis in spreadsheets and other workflows.
- **Recent Runs:** Provides a way to review recent processing activity while the backend's configured storage retains the relevant data.

## How It Works

1. **Provide lead data** using the application's supported input workflow.
2. **Clean and process records** to standardize data and identify duplicates or invalid email addresses.
3. **Score the leads** using predefined acquisition-fit rules.
4. **Review results** and inspect the factors behind individual scores.
5. **Filter and export** the results for further research or outreach planning.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite |
| Backend | Node.js, Express.js |
| Data Processing | JavaScript, rule-based scoring |
| Database Support | MongoDB integration, with in-memory storage as the default configuration |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Version Control | Git, GitHub |

## Architecture

The application separates the user interface from the backend processing layer.

- **Frontend:** React provides the interface for entering lead data, reviewing scores, filtering results, and exporting data.
- **Backend API:** Express handles lead-processing requests and the associated application logic.
- **Storage:** The backend supports an in-memory default and optional MongoDB integration. In-memory data may be lost when the server restarts; persistent MongoDB storage depends on configuring and verifying the database connection.
- **Deployment:** The frontend is hosted on Vercel and communicates with the deployed backend on Render through the configured `VITE_API_URL` environment variable.

## Running Locally

### Prerequisites

- Node.js 20 or newer (22 recommended) with npm. Check with `node -v` and `npm -v`.
- MongoDB only if you want saved runs to survive a restart. Without it the API keeps runs in memory.

### Environment variables

Both are optional for a local run.

| File | Variable | Meaning |
|---|---|---|
| `server/.env` | `MONGODB_URI` | MongoDB connection string. Leave empty to use in-memory storage. |
| `server/.env` | `PORT` | API port. Default `4000`. The client dev server proxies `/api` to port 4000, so keep it unless you also edit `client/vite.config.js`. |
| `server/.env` | `CORS_ORIGIN` | Comma-separated allowed frontend origins in production. Not needed locally. |
| `client/.env` | `VITE_API_URL` | Only for a hosted API. Leave empty locally (the dev proxy is used). |

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env` if you want to change anything. Never commit real values.

### Install

```powershell
cd server
npm install
cd ..\client
npm install
```

### Start (two terminals)

```powershell
# terminal 1: API on http://localhost:4000
cd server
npm run dev

# terminal 2: web app on http://localhost:5173
cd client
npm run dev
```

Open http://localhost:5173 and click **Use sample data**, then **Score leads**.

### Tests and build

```powershell
cd server; npm test
cd ..\client; npm test
npm run build        # production build into client/dist
npm run preview      # serve the built client
```

CI (`.github/workflows/ci.yml`) runs the same two test commands on Node 22.

## Deployment

The application is deployed using separate frontend and backend services.

- **Frontend:** [Vercel deployment](https://lead-scorer-xi.vercel.app/)
- **Backend:** Hosted on Render
- **Configuration:** The frontend's `VITE_API_URL` must point to the correct backend URL.

For a production deployment, configure the required environment variables in the hosting dashboards and verify that the frontend can communicate with the backend.

## Design Decisions

- **Explainable scoring:** Rule-based scores make it easier to understand why a lead receives a particular rating.
- **Data quality first:** Deduplication and validation help reduce avoidable noise during lead review.
- **Workflow-oriented UX:** Filtering and CSV export make results easier to use outside the application.
- **Separate application layers:** Independent frontend and backend deployments allow each layer to be maintained and updated separately.

## Current Scope and Limitations

- Scores are generated using predefined rules; the application does not use a trained machine-learning model.
- A score is a prioritization aid, not a guarantee that a business is a suitable acquisition target.
- Lead quality depends on the completeness and accuracy of the supplied data.
- In-memory storage is not durable across backend restarts. Persistent storage requires a correctly configured and tested database connection.
- The application processes supplied lead data; it should not be described as an automated web-scraping engine unless that functionality is implemented separately.

## Future Improvements

- Integrate additional authorized business-data sources.
- Add more robust email and business-record verification.
- Introduce configurable scoring criteria for different acquisition strategies.
- Support persistent lead history and saved searches.
- Add CRM integrations and workflow automation.

---

*Built to explore practical full-stack development, lead-data quality, explainable scoring, and acquisition-focused workflows.*
