import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const userId = request.cookies.get('user-id')?.value
  
  // Proteger la ruta /servicios/crear-material
  if (request.nextUrl.pathname.startsWith('/servicios/crear-material')) {
    if (!userId) {
      // Redirigir al login si no está autenticado
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/servicios/crear-material/:path*'
}

