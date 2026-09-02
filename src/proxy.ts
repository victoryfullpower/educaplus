import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hostCliente(request: NextRequest): string {
  return (request.headers.get('host') || '').split(':')[0].toLowerCase()
}

export function proxy(request: NextRequest) {
  const lockdownOn =
    process.env.NEXT_PUBLIC_SITE_ACCESS_LOCKDOWN === 'true' ||
    process.env.SITE_ACCESS_LOCKDOWN === 'true'

  if (lockdownOn) {
    const allowed = (
      process.env.NEXT_PUBLIC_SITE_ACCESS_ALLOWED_HOSTS ||
      process.env.SITE_ACCESS_ALLOWED_HOSTS ||
      'localhost,127.0.0.1'
    )
      .split(',')
      .map((h) => h.trim().split(':')[0].toLowerCase())
      .filter(Boolean)

    const host = hostCliente(request)
    if (!host || !allowed.includes(host)) {
      return new NextResponse(null, {
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      })
    }
  }

  const userId = request.cookies.get('user-id')?.value

  if (request.nextUrl.pathname.startsWith('/servicios/crear-material')) {
    if (!userId) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'
  ]
}
