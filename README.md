# Briants Product Builder

A web app to help create product listings for Briants' WooCommerce store. Upload a CSV with SKU/Name/Price, research each product, generate descriptions, pick categories, manage images, and export a WooCommerce-ready CSV.

## Quick Start (GitHub Codespaces)

1. Push this project to GitHub
2. Open the repo in GitHub and click **Code → Codespaces → Create codespace**
3. The devcontainer will auto-install dependencies
4. Run the app:

```bash
npm run dev
```

5. The frontend runs on **port 3000** and the API on **port 3001**
6. Codespaces will auto-forward both ports — click the port 3000 link to open the app

## Quick Start (Local)

Requires [Node.js](https://nodejs.org/) v18+.

```bash
npm install
npm run dev
```

## How to Use

### 1. Upload CSV
- Prepare a CSV file with columns: **SKU**, **Name**, **Price**
- Drag & drop or browse to upload
- Preview and confirm the import

### 2. Work Through Products
For each product in the queue:
- **Search**: Click "Search Google" — it opens a Google search for the product name
- **Confirm**: Find the right product page, paste its URL into the app
- **Scrape**: Click "Scrape Product Info" to auto-fill descriptions and find images
- **Edit**: Review and tweak the short description, long description, and features list
- **Categories**: Review suggested categories or browse the full Briants category tree
- **Images**: Approve the correct product images (they'll be downloaded automatically)
- **Save**: Hit Save to persist your progress

### 3. Export
- Go to the Export tab
- Set your website domain (for image URLs)
- Download the WooCommerce CSV
- Bulk upload the downloaded images to WordPress via FTP
- Import the CSV in WooCommerce → Products → Import

## Project Structure

```
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite dev server config
├── .devcontainer/            # GitHub Codespaces config
├── server/
│   ├── index.js              # Express API server
│   ├── categories.js         # Briants category tree + matching
│   └── scraper.js            # Web page scraper
├── index.html                # Main page
├── src/
│   ├── main.js               # App logic
│   ├── api.js                # API helper
│   └── styles.css            # Design system
└── data/                     # Auto-created at runtime
    ├── products.json          # Saved product data
    ├── images/                # Downloaded product images
    └── exports/               # Generated CSV files
```

## Tech Stack

- **Frontend**: Vanilla JS + Vite
- **Backend**: Node.js + Express
- **Scraping**: Cheerio (HTML parser)
- **CSV**: csv-parse / csv-stringify
