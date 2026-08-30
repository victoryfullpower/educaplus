import type { NextConfig } from 'next'

// Configuración para desarrollo (con soporte para rutas API)
// Para exportación estática, usar: npm run build:static
const nextConfig: NextConfig = {
  // No usar 'output: export' en desarrollo para permitir rutas API dinámicas
  // output: 'export', // Solo para builds estáticos
  serverExternalPackages: ['pdfjs-dist', 'pdf-to-img', 'html-to-docx'],
  experimental: {
    proxyClientMaxBodySize: '50mb'
  },
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Configuración para GitHub Pages: https://victoryfullpower.github.io/educaplus/
  // Solo usar basePath cuando se despliega en GitHub Pages, no en producción local
  basePath: process.env.BASE_PATH || '',
  assetPrefix: process.env.BASE_PATH ? `${process.env.BASE_PATH}/` : ''
}

export default nextConfig

