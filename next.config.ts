import type { NextConfig } from 'next'

// Configuración para desarrollo (con soporte para rutas API)
// Para exportación estática, usar: npm run build:static
const nextConfig: NextConfig = {
  // No usar 'output: export' en desarrollo para permitir rutas API dinámicas
  // output: 'export', // Solo para builds estáticos
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Configuración para GitHub Pages: https://victoryfullpower.github.io/educaplus/
  basePath: process.env.NODE_ENV === 'production' ? '/educaplus' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/educaplus/' : ''
}

export default nextConfig

