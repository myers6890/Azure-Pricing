# Aether — US Azure VM Quoter

A faster VM quoting tool for the **United States**, powered by the Microsoft Azure Retail Prices API (`2023-01-01-preview`). Built to match Azure Pricing Calculator accuracy for the meters that matter when you quote VMs all day.

## What it prices (live from Microsoft)

| Component | How it’s sourced |
|---|---|
| **Compute (Linux base)** | `Virtual Machines` consumption meters |
| **Windows license** | Windows VM meter − Linux meter (or Windows Server license meters) |
| **Windows Azure Hybrid Benefit** | Sets Windows license to $0 |
| **SQL Server Web / Standard / Enterprise** | `Virtual Machines Licenses` by vCPU (4-core minimum) |
| **SQL Azure Hybrid Benefit** | Sets SQL license to $0 |
| **Savings plans (1y / 3y)** | Nested `savingsPlan` rates on compute meters |
| **Reserved instances (1y / 3y)** | `priceType eq 'Reservation'` compute meters |
| **OS disks** | Premium SSD / Standard SSD / Standard HDD managed disks |

**Important (same as Pricing Calculator):** savings plans and reserved instances discount **compute only**. Windows and SQL licenses remain pay-as-you-go unless Hybrid Benefit is enabled.

## Quick start

```bash
npm install
npm run dev
```

- App: http://localhost:5173  
- API proxy: http://localhost:8787 → `https://prices.azure.com/api/retail/prices`

## Production

```bash
npm run build
npm start
```

## Quote workflow

1. Pick a **US region**
2. Search a VM size (`D4s_v5`, `E16ds_v5`, …)
3. Configure OS, Windows/SQL licensing, commitment, OS disk, quantity, hours
4. Compare PAYG vs savings plan vs reserved instance
5. Add lines to the quote cart and export CSV/JSON

## Notes

- USD Microsoft retail list prices
- EA / CSP negotiated discounts are not applied
- Default month = 730 hours
