import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function devApiMock() {
  return {
    name: 'dev-api-mock',
    configureServer(server) {
      server.middlewares.use('/api/evaluate', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          // Simulate a short delay
          setTimeout(() => {
            res.end(JSON.stringify({
              feedback: '[Dev mode] This is mock AI feedback. In production, this would be a real evaluation from Claude.\n\nTo test with the real API, build the project and run:\n  npx wrangler pages dev dist --compatibility-date=2024-01-01\n\nMake sure to set ANTHROPIC_API_KEY in your .dev.vars file.',
            }))
          }, 1000)
        })
      })
    },
  }
}

function questionsManifest() {
  const questionsDir = path.resolve(__dirname, 'public/questions')

  function getManifest() {
    if (!fs.existsSync(questionsDir)) return []
    return fs.readdirSync(questionsDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .map(f => `/questions/${f}`)
  }

  return {
    name: 'questions-manifest',

    // Serve manifest during dev
    configureServer(server) {
      server.middlewares.use('/questions/manifest.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(getManifest()))
      })
    },

    // Write manifest file into build output
    writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist')
      const dest = path.join(outDir, 'questions/manifest.json')
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, JSON.stringify(getManifest()))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), questionsManifest(), devApiMock()],
  server: {
    host: true,
    proxy: {
      // In production, Cloudflare Pages Functions handle /api/*.
      // For local dev without wrangler, this mock returns placeholder feedback.
      // To test with real API: npx wrangler pages dev dist --compatibility-date=2024-01-01
    },
  },
})
