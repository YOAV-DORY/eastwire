import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { article, ECONOMY_TAG } from '../../test/fixtures'
import { primaryPlace } from './places'
import { StoryCard } from './StoryCard'

const NOW = new Date('2026-10-13T12:00:00Z')
const NAMES = { IN: 'India', JP: 'Japan' }

const openDetails = () => userEvent.click(screen.getByRole('button', { name: 'Details' }))

describe('StoryCard', () => {
  it('links the headline to the original in a new tab, safely', () => {
    render(<StoryCard article={article()} countryNames={NAMES} now={NOW} />)
    const link = screen.getByRole('link', { name: /Metro line opens in Bengaluru/ })
    expect(link).toHaveAttribute('href', 'https://scroll.in/article/1/made-up')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('(opens in a new tab)')
  })

  it('puts publisher, main place and an honest time in one line under the headline', () => {
    render(<StoryCard article={article()} countryNames={NAMES} now={NOW} />)
    expect(screen.getByText('Scroll.in')).toBeInTheDocument()
    expect(screen.getByText('Bengaluru')).toBeInTheDocument()
    // No publication time from the source: say when it was found, not when it was published.
    expect(screen.getByText('found 12 min ago')).toHaveAttribute('dateTime', '2026-10-13T11:48:00Z')
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it("shows the story's own date, so an old story never looks fresh", () => {
    render(
      <StoryCard
        article={article({ publishedAt: '2026-09-25T08:00:00Z', isNew: false })}
        countryNames={NAMES}
        now={NOW}
      />,
    )
    expect(screen.getByText('25 Sept')).toHaveAttribute('dateTime', '2026-09-25T08:00:00Z')
    expect(screen.queryByText('New')).not.toBeInTheDocument()
  })

  it('keeps provenance behind Details', async () => {
    render(<StoryCard article={article({ alsoReportedBy: 2 })} countryNames={NAMES} now={NOW} />)
    expect(screen.queryByText(/GDELT Project/)).not.toBeInTheDocument()
    await openDetails()
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Found through the GDELT Project/)).toHaveTextContent('also reported by 2 other sources')
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
  })

  it('labels places by role and marks low confidence in text, not only by style', async () => {
    render(
      <StoryCard
        article={article({
          locations: [
            { role: 'mentioned', precision: 'city', confidence: 'low', method: 'gazetteer', country: 'JP', placeId: 1850147, placeName: 'Tokyo', evidence: 'Mentions Tokyo', primary: false },
            { role: 'event', precision: 'city', confidence: 'high', method: 'dateline', country: 'JP', placeId: 1853909, placeName: 'Osaka', evidence: 'Dateline: Osaka', primary: true },
          ],
        })}
        countryNames={NAMES}
        now={NOW}
      />,
    )
    await openDetails()
    const places = within(screen.getByRole('list', { name: 'Places' }))
    expect(places.getByText(/Mentions: Tokyo/)).toHaveTextContent('(low confidence)')
    expect(places.getByText(/Dateline: Osaka/)).toHaveTextContent('(what the story is about)')
  })

  it('has three clear weights: lead, standard and compact', () => {
    const story = article({ excerpt: 'A licensed excerpt.' })
    const { rerender } = render(<StoryCard article={story} variant="lead" now={NOW} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Metro line opens in Bengaluru')
    rerender(<StoryCard article={story} variant="standard" now={NOW} />)
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    expect(screen.getByText('A licensed excerpt.')).toBeInTheDocument()
    rerender(<StoryCard article={story} variant="compact" now={NOW} />)
    expect(screen.queryByText('A licensed excerpt.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument()
  })

  it('tells a map which pin to light while the reader points at the story', async () => {
    const lit: (number | null)[] = []
    render(<StoryCard article={article()} now={NOW} onHighlight={(id) => lit.push(id)} />)
    await userEvent.hover(screen.getByRole('article'))
    await userEvent.unhover(screen.getByRole('article'))
    expect(lit).toEqual([1277333, null])
  })
})

describe('primaryPlace', () => {
  it('names the main-subject city, else its country, and never a passing mention or the publisher', () => {
    expect(primaryPlace(article().locations, NAMES)).toBe('Bengaluru')
    expect(primaryPlace([article().locations[1]], NAMES)).toBeNull()
    expect(
      primaryPlace([{ ...article().locations[0], precision: 'country', placeId: null, placeName: null }], NAMES),
    ).toBe('India')
    expect(primaryPlace([{ ...article().locations[0], primary: false }], NAMES)).toBeNull()
  })

  it('explains a sector tag with the rules that matched, on request', async () => {
    render(
      <MemoryRouter>
        <StoryCard article={article({ sectors: [ECONOMY_TAG] })} countryNames={NAMES} now={NOW} />
      </MemoryRouter>,
    )
    await openDetails()
    const tag = screen.getByRole('button', { name: 'Economy: why this sector' })
    expect(tag).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(tag)
    expect(tag).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Tagged Economy because of:')).toBeInTheDocument()
    expect(screen.getByText('“inflation” in the headline')).toBeInTheDocument()
    expect(screen.getByText('GDELT theme ECON_INFLATION')).toBeInTheDocument()
    // 3 themes listed at +1 each, but only +2 counted (score 5 = 3 + 2).
    expect(screen.getByText('GDELT themes count for at most +2 together.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'How we tag Economy' })).toHaveAttribute('href', '/sector/economy')
  })

  it('shows no sector row for an untagged story', async () => {
    render(<StoryCard article={article()} countryNames={NAMES} now={NOW} />)
    await openDetails()
    expect(screen.queryByRole('list', { name: 'Sectors' })).not.toBeInTheDocument()
  })
})
