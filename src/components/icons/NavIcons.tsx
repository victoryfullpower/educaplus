import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const defaults: IconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
}

export type NavIconName =
  | 'home'
  | 'users'
  | 'plans'
  | 'services'
  | 'books'
  | 'sparkles'
  | 'graduation'
  | 'login'
  | 'logout'
  | 'userPlus'

export function NavIcon({
  name,
  size = 18,
  className
}: {
  name: NavIconName
  size?: number
  className?: string
}) {
  const props: IconProps = {
    ...defaults,
    width: size,
    height: size,
    className
  }

  switch (name) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M9 20v-6h6v6" />
        </svg>
      )
    case 'users':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M14.5 20c.5-2.2 2-3.5 4-3.5" />
        </svg>
      )
    case 'plans':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 15h2" />
          <path d="M14 15h2" />
        </svg>
      )
    case 'services':
      return (
        <svg {...props}>
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <path d="m5.6 5.6 2.1 2.1" />
          <path d="m16.3 16.3 2.1 2.1" />
          <path d="m5.6 18.4 2.1-2.1" />
          <path d="m16.3 7.7 2.1-2.1" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      )
    case 'books':
      return (
        <svg {...props}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H18v16H6.5A2.5 2.5 0 0 0 4 20.5Z" />
          <path d="M6.5 3v16" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg {...props}>
          <path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
          <path d="M5 3v2" />
          <path d="M4 4h2" />
          <path d="M19 17v2" />
          <path d="M18 18h2" />
        </svg>
      )
    case 'graduation':
      return (
        <svg {...props}>
          <path d="M3 9.5 12 4l9 5.5-9 5.5-9-5.5z" />
          <path d="M6 12v4.5c0 1.2 2.7 2.5 6 2.5s6-1.3 6-2.5V12" />
          <path d="M21 9.5v5" />
        </svg>
      )
    case 'login':
      return (
        <svg {...props}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 12H3" />
          <path d="m7 8-4 4 4 4" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...props}>
          <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
          <path d="M14 12H3" />
          <path d="m17 8 4 4-4 4" />
        </svg>
      )
    case 'userPlus':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5" />
          <path d="M19 8v6" />
          <path d="M16 11h6" />
        </svg>
      )
    default:
      return null
  }
}
