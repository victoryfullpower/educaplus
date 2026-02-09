import type { NextConfig } from 'next'

// Configuración para exportación estática (GitHub Pages)
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Configuración para GitHub Pages: https://victoryfullpower.github.io/educaplus/
  basePath: process.env.NODE_ENV === 'production' ? '/educaplus' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/educaplus/' : ''
}

export default nextConfig

