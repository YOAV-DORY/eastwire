import { useEffect } from 'react'

export const SITE_TITLE = 'EastWire · News from China, India, South Korea and Japan'

/** Sets the tab title for the page: "Map · EastWire", or the site title on the front page. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · EastWire` : SITE_TITLE
  }, [title])
}
