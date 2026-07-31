import { defineConfig, loadEnv } from 'vite'
import type { ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

// O proxy abaixo so roda no dev server. A chave vem do .env (nao versionado)
// em vez de ficar hardcoded no repositorio.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiFootballKey = env.VITE_API_FOOTBALL_KEY ?? ''

  const withApiKey = (target: string, prefix: string): ProxyOptions => ({
    target,
    changeOrigin: true,
    rewrite: (path) => path.replace(new RegExp(`^${prefix}`), ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('x-apisports-key', apiFootballKey)
      })
    }
  })

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api-football': withApiKey('https://v3.football.api-sports.io', '/api-football'),
        '/api-football-media': withApiKey('https://media.api-sports.io', '/api-football-media')
      }
    }
  }
})
