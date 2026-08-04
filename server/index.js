import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8787
const AZURE_PRICES =
  'https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview'
const cache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

app.use(cors())

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

app.get('/api/retail/prices', async (req, res) => {
  try {
    const url = new URL(AZURE_PRICES)
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') url.searchParams.set(key, value)
    }

    const cacheKey = url.toString()
    const cached = cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      res.set('Cache-Control', 'public, max-age=300')
      res.set('X-Aether-Cache', 'HIT')
      res.json(cached.data)
      return
    }

    let upstream
    for (let attempt = 0; attempt < 4; attempt += 1) {
      upstream = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      if (upstream.status !== 429) break
      await sleep(500 * 2 ** attempt)
    }

    if (!upstream.ok) {
      const text = await upstream.text()
      res.status(upstream.status).type('text/plain').send(text)
      return
    }

    const data = await upstream.json()
    cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, data })
    res.set('Cache-Control', 'public, max-age=300')
    res.set('X-Aether-Cache', 'MISS')
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
