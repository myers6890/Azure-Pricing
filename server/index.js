import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8787
const AZURE_PRICES =
  'https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview'

app.use(cors())

app.get('/api/retail/prices', async (req, res) => {
  try {
    const url = new URL(AZURE_PRICES)
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') url.searchParams.set(key, value)
    }

    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      res.status(upstream.status).type('text/plain').send(text)
      return
    }

    const data = await upstream.json()
    res.set('Cache-Control', 'public, max-age=300')
    res.json(data)
  } catch (error) {
    console.error('Retail prices proxy error:', error)
    res.status(502).json({
      error: 'Failed to reach Microsoft Azure Retail Prices API',
      detail: error instanceof Error ? error.message : String(error),
    })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, source: 'Microsoft Azure Retail Prices API' })
})

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Aether API proxy listening on http://localhost:${PORT}`)
})
