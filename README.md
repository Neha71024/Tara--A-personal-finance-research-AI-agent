# Tara - Personal Finance Research Assistant

Welcome to the **Tara** Finance-Research Agent project. This project is built using the **Mastra SDK**, **Node.js**, **Express**, and **PostgreSQL**.

## Live Deployment
The API server is deployed on Render and is fully operational:
* **Ask Endpoint**: `https://tara-a-personal-finance-research-ai-agent.onrender.com/ask`
* **Method**: `POST`
* **Body**: `{"question": "<your spending or mutual fund question>"}`

---

## 1. Prerequisites & Setup

### Database (PostgreSQL)
Ensure you have a running PostgreSQL instance on port `5432` with a `postgres` superuser.
If you have Docker installed, you can start one instantly:
```bash
docker run -d --name tara-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:latest
```

### Environment Variables
Configure the environment file. Create or edit the `.env` file in the `tara` directory:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
DATABASE_URL=postgres://postgres:postgres@localhost:5432/provue_tara
```

---

## 2. Installation & Initialization

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database Schema**:
   This script verifies the connection, creates the target database (`provue_tara`), and initializes the tables:
   ```bash
   node scripts/check-db.js
   ```

3. **Ingest Sample Data**:
   Ingest the sample data snapshot from the `data/sample_a` folder (or specify any other folder path via the `DATA_DIR` environment variable):
   ```bash
   npx tsx scripts/ingest.ts
   ```

---

## 3. Running the Project

You can run the Mastra Studio interface and/or the production API server.

### Start the Express API Server (Production ask endpoint)
Exposes the required `/ask` endpoint on port `3000`:
```bash
npx tsx src/server.ts
```
Or in development watch mode:
```bash
npx tsx watch src/server.ts
```

### Start Mastra Studio (Development environment)
Starts the Mastra Studio playground on **[http://localhost:4111](http://localhost:4111)**:
```bash
npm run dev
```

---

## 4. Running Evaluations

We provide a repeatable evaluation script containing 12 finance-related queries (lookups, date ranges, refunds, merchant aliases, transfers, comparisons, recurring checks, and mutual fund return math).

Run the tests against the local server:
```bash
npx tsx scripts/eval.ts
```

*Note: If your API key is rate-limited or exhausted during local testing, you can enable mock mode for verification:*
```bash
# In Windows Powershell:
$env:MOCK_LLM="true"; npx tsx scripts/eval.ts
```

---

## 5. Observability & Logging

Every request sent to `/ask` is logged as a structured JSON entry in **`tara.log`** containing:
* `request_id` (a generated UUID)
* `original_question`
* `tools_called` (chronological list of executed tools)
* `sanitized_tool_inputs`
* `database_tables_read`
* `latency_ms`
* `status` (success or error)
* `error_message` (if applicable)