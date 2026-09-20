# Design Notes & Architecture Decisions

**Project**: INE Product Price Tracker  
**Target Store**: [https://demo.inelabteamdev.com/](https://demo.inelabteamdev.com/)  
**Author**: Candidate for Software Engineer Intern Assignment  

---

## 1. System Overview & Architecture

The INE Product Price Tracker is an end-to-end full-stack application built to track prices and stock availability of products from INE's hosted mock e-commerce store (`demo.inelabteamdev.com`).

### High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACE                                    |
|   React 18 + Vite + Tailwind CSS + Lucide Icons + Recharts                        |
|   - Real-time catalog search with instant debounce                                |
|   - Monitored products dashboard with active/pause toggles                        |
|   - Interactive price trend charts (Min/Max reference lines & stock tooltips)     |
|   - Observable scrape logs audit table with expandable error traces               |
+------------------------------------------+----------------------------------------+
                                           | HTTP JSON API (/api/*)
                                           v
+-----------------------------------------------------------------------------------+
|                              BACKEND CONTROLLERS & API                            |
|   Node.js + Express.js API Server (Port 5000)                                     |
|   - /api/products/search       (Cached catalog search)                            |
|   - /api/tracked-products      (CRUD & tracking state management)                 |
|   - /api/scrape/all            (Manual trigger from dashboard)                    |
|   - /api/scrape/single/:id     (Manual single product scrape)                     |
|   - /api/scrape                (POST: Protected cron endpoint with CRON_SECRET)   |
|   - /api/scrape/logs           (Audit trail of all attempts & durations)          |
+---------------------+-------------------------------------+-----------------------+
                      |                                     |
                      v                                     v
+-----------------------------------+ +-----------------------------------------------+
|       DATABASE PERSISTENCE        | |              SCRAPER ENGINE                   |
|   Supabase PostgreSQL             | |   Playwright Chromium Automation Engine       |
|   (with seamless in-memory fallback| |   - Dynamic JS challenge solving              |
|   for local evaluation)           | |   - Cookie overlay dismissal                  |
|   - tracked_products              | |   - Human-like mouse motion emulation         |
|   - price_history                 | |   - "Try again" anti-flakiness loop           |
|   - scrape_logs                   | |   - Exponential backoff retry handler         |
+-----------------------------------+ +-----------------------+-----------------------+
                                                              | HTTPS Automation
                                                              v
                                              +-------------------------------+
                                              |       INE MOCK STORE          |
                                              |   demo.inelabteamdev.com      |
                                              |   (React 19 SPA + Obfuscated  |
                                              |    client challenge barrier)  |
                                              +-------------------------------+
```

---

## 2. Scraping Strategy: HTTP Fetch vs Headless Playwright Chromium

### Initial Investigation & Rationale
An automated scraper's first principle is efficiency: if a fast HTTP `fetch()` with Cheerio or a direct JSON API can obtain the target data, heavy browser engines should be avoided. We rigorously analyzed the target mock store to test this:

1. **HTML Inspection**:
   When fetching `https://demo.inelabteamdev.com/product/57` via plain HTTP GET, the returned HTML contains:
   ```html
   <div id="root"></div>
   <script type="module" src="/assets/index-BfT6i22l.js"></script>
   ```
   There is **no product price, MRP, or stock status** anywhere in the server-rendered HTML. It is a client-rendered React 19 Single Page Application.

2. **Metadata API Analysis (`/api/product/:id`)**:
   Inspecting network requests revealed an endpoint: `GET /api/product/57`. However, examining its JSON payload shows:
   ```json
   {
     "id": 57,
     "slug": "nordkraft-backpack-pro",
     "name": "Nordkraft Backpack Pro",
     "brand": "Nordkraft",
     "category": "Bags",
     "sku": "NOR-10057",
     "description": "The Nordkraft Backpack Pro is engineered...",
     "features": [...],
     "reviews": [...]
   }
   ```
   Noticeably, **`price`, `mrp`, and `stock` fields are completely omitted** from this endpoint.

3. **Challenge Protection & Interactive Gatekeeper (`/api/products/:id/price`)**:
   The mock store explicitly guards the actual price behind an interactive barrier:
   - To fetch the price, the client must call `POST /api/challenge` to obtain a cryptographic salt and difficulty.
   - The browser must execute a WebAssembly proof-of-work algorithm.
   - The client records mouse tracking telemetry (`att` token) capturing cursor trajectory, jitter, and dwell time.
   - The client exchanges this at `POST /api/session` with an encrypted challenge token. Only upon receiving a valid `sessionToken` does `GET /api/products/:id/price?sessionToken=...` return the real price.
   - If an automated bot makes direct HTTP requests to `/api/session`, the server responds with `401 Unauthorized {"error":"unauthorized"}`.

### Conclusion
Because the store actively verifies client execution and human behavioral telemetry in the browser runtime, **Playwright Chromium is strictly necessary** to reliably obtain the genuine price and stock. Plain HTTP HTML parsers fail completely.

---

## 3. Mock Store Anti-Scraping Obstacles & Solutions

During live browser testing, we uncovered three intentional obstacles engineered into the mock store's client bundle:

| Obstacle | Behavior in Store Client Code | Engineered Solution in `productScraper.js` |
| :--- | :--- | :--- |
| **Flaky Click Drop (`Xn`)** | The client bundle wraps button handlers in an obfuscated utility `Xn` that randomly suppresses 17.5% of clicks and delays 25% by 900ms. | If after clicking `#reveal-price` or `.price-idle button`, the container remains in the `.price-idle` state for >1.5s, the scraper dispatches a simulated smooth mouse movement and clicks again. |
| **Delayed Cookie Modal (`.cookie-overlay`)** | An invasive modal `<div class="cookie-overlay">` randomly mounts 1-3 seconds after page load, blocking all pointer events with `pointer-events: auto`. | In `clearCookieOverlay()`, the scraper aggressively checks for `.cookie-overlay` and dismisses it via its accept button, or safely removes it from the DOM before clicking. |
| **Transient Challenge Failure (`challenge_failed`)** | When the mock store's challenge verification sporadically fails, the UI renders: *"Couldn't load the price after 1 attempts. challenge_failed [TRY AGAIN]"*. | The scraper detects the presence of the `button:has-text("Try again")` and automatically clicks it with humanized mouse trajectory, waiting for the real price to render. |
| **Unusual Unicode Characters in Price** | Price strings contain zero-width spaces (`\u200B`), non-breaking spaces (`\u00A0`), rupee symbols (`₹`, `Rs.`), and full-width Unicode numerals. | `priceParser.js` cleans all invisible characters, removes non-numeric symbols, and converts Indian numbering notation (`₹21,767` $\rightarrow$ `21767.00`). |

---

## 4. Scheduled Architecture & Production Readiness

### Why Not `setInterval()`?
A common antipattern in student assignments is placing `setInterval(scrapeAll, 2 * 60 * 60 * 1000)` inside `server.js`. In production environments:
1. **PaaS Sleep Cycles**: Free-tier hosting platforms (such as Render, Fly.io, or Heroku) spin down dynos/containers after 15 minutes of inbound HTTP inactivity. Any in-process timers (`setInterval`, `cron` npm packages) are immediately frozen and terminated.
2. **Multi-Instance Duplication**: If the server scales horizontally to multiple containers, each container runs its own `setInterval()`, multiplying scrape requests and causing race conditions in the database.
3. **Memory Leaks**: Long-running Node.js processes holding browser instances eventually leak memory.

### Production Solution: External Webhook Trigger (`POST /api/scrape`)
- We exposed a dedicated endpoint: `POST /api/scrape`.
- The endpoint is secured with the `CRON_SECRET` bearer token (`Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`). Unauthorized calls receive `401 Unauthorized`.
- An external cron service (e.g. **cron-job.org**, **GitHub Actions**, or **EasyCron**) sends an HTTP POST request to `https://<backend-url>/api/scrape` every 2 hours (`0 */2 * * *`).
- This wakes the sleeping container on Render, executes the scraper batch, logs every attempt to PostgreSQL, updates `price_history`, and allows the container to return to idle.
- An in-memory lock (`isScrapeRunning`) prevents overlapping concurrent batch executions.

---

## 5. Resilience & Retry Strategy

Each scrape attempt adheres to an observable lifecycle:

1. **Attempt Level (Within Browser)**:
   - Up to 3 internal attempts to solve challenge and click "Try again".
2. **Batch Level (Orchestrator)**:
   - If an unhandled exception or network timeout occurs, the scraper initiates exponential backoff:
     $$\text{delay} = 2000 \times 2^{\text{attempt} - 1} + \text{jitter}$$
   - Max retries: 3.
3. **Observability & Logging**:
   - Every single attempt is logged to the `scrape_logs` table with:
     - `status`: `'SUCCESS'`, `'RETRIED'`, or `'FAILED'`
     - `attempt_number`: 1, 2, or 3
     - `duration_ms`: Execution time in milliseconds
     - `error_message`: Full error message and stack trace if failed
     - `attempted_at`: Timestamp
   - A failure in scraping one product never crashes or stops the scrape of other products.

---

## 6. AI Tools and Corrections

As required by the assignment guidelines, this section candidly details the role of AI coding tools in this project, specific flaws or incorrect assumptions made by the AI, and how engineering discernment and manual reverse-engineering corrected them.

### What AI Tools Were Used
- **Google Antigravity Agentic AI Assistant**: Used for project scaffolding, writing boilerplate SQL migrations, setting up Express routes, designing Tailwind UI components, and drafting Recharts visual elements.

### Flaws, Hallucinations & Critical Corrections

#### 1. AI Assumption: "Simple HTTP Fetch + Cheerio is Sufficient"
- **The AI's Proposal**: The AI initially assumed the mock store was a traditional SSR website where price and stock could be scraped using `axios` and `cheerio` by querying `.price` or `#price`.
- **Why It Was Wrong**: When executing the initial test, the returned HTML was simply `<div id="root"></div>`. No prices existed.
- **The Correction**: We rejected the AI's proposal and initiated deep reverse-engineering of the mock store. We uncovered that the store is an obfuscated React 19 SPA where `/api/product/:id` deliberately omits price, and price is fetched only after an interactive browser challenge solved via WebAssembly and mouse telemetry. We mandated Playwright Chromium as the engine.

#### 2. AI Code Issue: Standard Click Action Failed Due to Cookie Overlay
- **The AI's Proposal**: The AI wrote standard Playwright locator code:
  ```javascript
  await page.locator('.price-block button').click();
  ```
- **Why It Was Wrong**: During execution, Playwright repeatedly threw a `TimeoutError (30000ms)`:
  ```
  locator.click: Timeout 30000ms exceeded.
  - <div class="cookie-overlay">…</div> intercepts pointer events
  - retrying click action...
  ```
- **The Correction**: We inspected the DOM and found a randomized cookie consent modal that mounts 1-3 seconds after load. We implemented `clearCookieOverlay()`, which checks for the overlay and either clicks its consent button or removes it from the DOM before attempting any interaction.

#### 3. AI Code Issue: Flaky Clicks Dropped by Store's `Xn` Function
- **The AI's Proposal**: The AI assumed a single click would trigger the price fetch.
- **Why It Was Wrong**: In 17.5% of cases, the click landed, but the store's `Xn` wrapper dropped the event. The button remained in its unclicked `.price-idle` state indefinitely.
- **The Correction**: We added a state check loop: if after 1,200ms the button still displays "Reveal price" and the container remains `.price-idle`, the scraper moves the mouse along a realistic spline curve and clicks again.

#### 4. AI Assumption: In-Memory `setInterval` for Scheduled Scraping
- **The AI's Proposal**: The AI initially recommended using `node-cron` or `setInterval` within the Express server for the 2-hour schedule.
- **Why It Was Wrong**: As experienced engineers know, free-tier hosting services like Render put idle web services to sleep. In-memory timers stop running, meaning products would never be scraped after the initial 15 minutes.
- **The Correction**: We architected the system with an external cron trigger (`POST /api/scrape`) authenticated via `CRON_SECRET`, specifically designed for external schedulers like cron-job.org or GitHub Actions.
