# SplitSheet — Local-First Couple Expense Tracker PWA (Backed by Google Sheets)

A fast, zero-cost, offline-capable Progressive Web App (PWA) built specifically for two partners to track shared expenses, multi-currency trips, and settlements — using a **shared Google Sheet in your personal Google Drive** as the live database.

## Key Features

- **Live Google Sheet in Google Drive ($0 Backend):** Every transaction syncs to a structured `Transactions` sheet in your Google Drive, alongside a native `Dashboard` tab with live spreadsheet formulas.
- **0ms Local-First UI & Offline Queue:** Powered by `IndexedDB` + `localStorage`. The app opens instantaneously, works offline (on flights or subways), and syncs queued changes in the background.
- **Advanced Multi-Facet Search & Filters (Fixing Tricount's Weakness):**
  - Instant multi-keyword search across title, notes, category, payer, currency, and amount.
  - Filter by **Date Presets** (`This Month`, `Last Month`, `Last 3 Months`, `This Year`, `Custom Date Range`), **Categories** (multi-select), **Who Paid**, **Split Mode** (`50/50`, `100% Owed`, `Custom`, `Settlements`), and **Amount Range** (`Min` / `Max`).
  - **Live Filtered Totals Banner:** Immediately calculates total spending and each partner's paid/fair-share breakdown for the active filter.
- **Multi-Currency with Live Exchange Rates:** Enter expenses in any currency (`EUR`, `USD`, `BRL`, `GBP`, `JPY`, `CHF`, `CAD`, etc.) with automatic ECB historical/live exchange rate lookup via the free [Frankfurter API](https://www.frankfurter.app/) + manual rate override.
- **Tricount / CSV Import & Export:** Import your existing Tricount or Splitwise CSV history in one click, or export your ledger to CSV/JSON anytime.
- **1-Tap Partner Invite Link:** Configure the Google Sheet once on your phone, then click **"Copy Invite Link for Partner"** in Settings — opening that link on your girlfriend's phone configures her app automatically.

---

## Step-by-Step Deployment & Phone Installation Guide

### Part 1: Set Up the Shared Google Sheet in Google Drive (2 minutes)

1. Open [Google Drive](https://drive.google.com) and create a new **Google Sheet** (e.g., `Our Shared Expenses`).
2. Share the Google Sheet with your girlfriend (`Share` button in top right) so you can both view it in Google Drive anytime.
3. In the Google Sheet menu, click **Extensions → Apps Script**.
4. Delete any placeholder code in `Code.gs` and paste the entire contents of [`google-apps-script/Code.gs`](./google-apps-script/Code.gs).
5. At the top of `Code.gs`, change `const SECRET_KEY = 'change-me-secret-key';` to a secret passphrase of your choice.
6. In the top right of the Apps Script editor, click **Deploy → New deployment**:
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Description:** `SplitSheet API`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone` *(Required so the PWA can send requests without expiring OAuth popups; requests are protected by your `SECRET_KEY`)*.
7. Click **Deploy**, authorize the script with your Google account (if Google shows an "unverified app" prompt for your own script, click **Advanced → Go to Untitled project (unsafe) → Allow**).
8. Copy the generated **Web app URL** (`https://script.google.com/macros/s/AKfycb.../exec`).

---

### Part 2: Deploy the Frontend PWA for Free (2 minutes)

You can host the static build for free on **GitHub Pages** (already configured in `.github/workflows/deploy.yml`), **Vercel**, or **Cloudflare Pages**:

#### Option A: GitHub Pages (Automated via included GitHub Action)
1. Create a new repository on GitHub (can be public; your Google Sheet URL & Secret Key are never stored in code — they only live in your phone's local storage).
2. Push this repository to GitHub:
   ```bash
   git remote add origin git@github.com:<your-username>/splitsheet.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**, and under **Build and deployment → Source**, select **GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) will build and publish your PWA at `https://<your-username>.github.io/splitsheet/`.

#### Option B: Vercel or Cloudflare Pages
1. Import your GitHub repository into [Vercel](https://vercel.com) or [Cloudflare Pages](https://pages.cloudflare.com).
2. Build command: `npm run build` | Output directory: `dist`.

---

### Part 3: Connect & Install on Both Phones (1 minute)

1. Open your deployed URL on your phone.
2. Tap the **Settings (gear icon)** in the top right:
   - Enter your name (`Partner A`) and your girlfriend's name (`Partner B`), and pick your **Base Currency**.
   - Paste your **Google Apps Script Web App URL** and **Secret Key**, then tap **Save & Sync Sheet**.
   - *(The Google Sheet will automatically create and format the `Transactions`, `Config`, and `Dashboard` tabs on first sync!)*
3. Still inside Settings, tap **"Copy Invite Link for [Partner Name]"** and send that link to your girlfriend on WhatsApp/iMessage. When she opens it, her phone is automatically configured and synced!
4. **Install to Home Screen (PWA):**
   - **iOS (Safari):** Tap the **Share** button at the bottom of Safari → scroll down and tap **Add to Home Screen**.
   - **Android (Chrome):** Tap the **three-dot menu** in the top right → tap **Add to Home screen / Install app**.
