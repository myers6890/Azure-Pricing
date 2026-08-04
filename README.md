# Aether — Azure Pricing Calculator

A faster, clearer Azure pricing calculator powered by the **Microsoft Azure Retail Prices API** (`2023-01-01-preview`).

## Why Aether

Microsoft’s official calculator is powerful but heavy. Aether focuses on the workflows engineers actually need:

- **Live retail meters** from Microsoft’s unauthenticated Retail Prices API
- **Instant SKU search** across product, meter, and ARM SKU names
- **Savings plan visibility** (1-year / 3-year) inline with pay-as-you-go
- **Region radar** to compare the same SKU across major Azure regions
- **Live estimate cart** with quantity, hours/month, and commitment mode
- **CSV / JSON export** for sharing cost models

## Quick start

```bash
npm install
npm run dev
```

- App: [http://localhost:5173](http://localhost:5173)
- API proxy: [http://localhost:8787](http://localhost:8787)

The Express proxy at `/api/retail/prices` forwards to:

`https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview`

## Production

```bash
npm run build
npm start
```

Serves the built UI and the Microsoft API proxy on port `8787` (or `PORT`).

## API notes

- No Azure subscription or auth is required for retail list prices
- Filter values are case-sensitive on the preview API
- Responses paginate at 1,000 items; Aether follows `NextPageLink` through the proxy
- Savings plan rates are only available on `api-version=2023-01-01-preview`

## Stack

- React + TypeScript + Vite
- Express proxy for the Microsoft Retail Prices API
- Sora + IBM Plex Mono typography
