import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { article } from '../../test/fixtures'
import { primaryPlace } from './places'
import { StoryCard } from './StoryCard'

const NOW = new Date('2026-10-13T12:00:00Z')
const NAMES = { IN: 'India', JP: 'Japan' }

describe('StoryCard', () => {
  it('links the headline to the original in a new tab, safely', () => {
    render(<StoryCard article={article()} countryNames={NAMES} now={NOW} />)
    const link = screen.getByRole('link', { name: /Metro line opens in Bengaluru/ })
    expect(link).toHaveAttribute('href', 'https://scroll.in/article/1/made-up')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('(opens in a new tab)')
  })

  it('shows publisher, provenance, place and an honest time label', () => {
    render(<StoryCard article={article()} countryNames={NAMES} now={NOW} />)
    expect(screen.getByText('Scroll.in')).toBeInTheDocument()
    expect(screen.getByText('via GDELT')).toBeInTheDocument()
    expect(screen.getByText('IN · Bengaluru')).toBeInTheDocument()
    // No publication time from the source: say when it was found, not when it was published.
    expect(screen.getByText('found 12 min ago')).toHaveAttribute('dateTime', '2026-10-13T11:48:00Z')
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('never invents an excerpt, and shows one only when the source allowed it', () => {
    const { rerender } = render(<StoryCard article={article()} now={NOW} />)
    expect(screen.queryByText(/excerpt/i)).not.toBeInTheDocument()
    rerender(
      <StoryCard
        article={article({
          excerpt: 'A licensed excerpt.',
          attribution: 'By A. Writer, Global Voices · CC BY 3.0 · excerpt, shortened',
          license: { name: 'CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0/' },
          viaDiscovery: false,
        })}
        now={NOW}
      />,
    )
    expect(screen.getByText('A licensed excerpt.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'license' })).toHaveAttribute('rel', 'noopener noreferrer license')
    expect(screen.queryByText('via GDELT')).not.toBeInTheDocument()
  })

  it('labels places by role and marks low confidence in text, not only by style', () => {
    render(
      <StoryCard
        article={article({
          locations: [
            { role: 'mentioned', precision: 'city', confidence: 'low', method: 'gazetteer', country: 'JP', placeId: 1850147, placeName: 'Tokyo', evidence: 'Mentions Tokyo' },
            { role: 'event', precision: 'city', confidence: 'high', method: 'dateline', country: 'JP', placeId: 1853909, placeName: 'Osaka', evidence: 'Dateline: Osaka' },
          ],
        })}
        countryNames={NAMES}
        now={NOW}
      />,
    )
    const places = within(screen.getByRole('list', { name: 'Places' }))
    expect(places.getByText(/Mentions: Tokyo/)).toHaveTextContent('(low confidence)')
    expect(places.getByText('Dateline: Osaka')).toBeInTheDocument()
  })

  it('counts other reports of the same story', () => {
    render(<StoryCard article={article({ alsoReportedBy: 2 })} now={NOW} />)
    expect(screen.getByText('Also reported by 2 sources')).toBeInTheDocument()
  })
})

describe('primaryPlace', () => {
  it('prefers a city, ignores the publisher, falls back to the country name', () => {
    expect(primaryPlace(article().locations, NAMES)).toBe('IN · Bengaluru')
    expect(primaryPlace([article().locations[1]], NAMES)).toBeNull()
    expect(
      primaryPlace([{ ...article().locations[0], precision: 'country', placeId: null, placeName: null }], NAMES),
    ).toBe('India')
  })
})
