import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { article, ECONOMY_TAG } from '../../test/fixtures'
import { primaryPlace } from './places'
import { StoryCard } from './StoryCard'

const NOW = new Date('2026-10-13T12:00:00Z')
const NAMES = { IN: 'India', JP: 'Japan' }

const openDetails = () => userEvent.click(screen.getByRole('button', { name: /^Details/ }))

describe('StoryCard', () => {
  it('links the headline (and so the whole card) to the original in a new tab, safely', () => {
    render(<StoryCard article={article()} countryNames={NAMES} now={NOW} />)
    const link = screen.getByRole('link', { name: /Metro line opens in Bengaluru/ })
    expect(link).toHaveAttribute('href', 'https://scroll.in/article/1/made-up')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('read at Scroll.in, opens in a new tab')
    expect(screen.getByText('Read at source')).toBeInTheDocument()
  })

  it('puts the main place over the headline and the publisher with an honest time under it', () => {
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

  it('keeps provenance in the story sheet that Details opens, and closes it again', async () => {
    render(<StoryCard article={article({ alsoReportedBy: 2 })} countryNames={NAMES} now={NOW} />)
    expect(screen.queryByText(/GDELT Project/)).not.toBeInTheDocument()
    await openDetails()
    const sheet = screen.getByRole('dialog', { name: /Metro line opens in Bengaluru/ })
    expect(within(sheet).getByText(/Found through the GDELT Project/)).toHaveTextContent('also reported by 2 other sources')
    expect(within(sheet).getByRole('link', { name: /Read at Scroll.in/ })).toHaveAttribute('href', 'https://scroll.in/article/1/made-up')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Close story details' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
    const sheet = within(screen.getByRole('dialog'))
    expect(sheet.getByText(/About: Tokyo/)).toHaveTextContent('low confidence')
    expect(sheet.getByText(/Dateline: Osaka/)).toHaveTextContent('(what the story is about)')
  })

  it('shows the summary on cards, not in list rows, and no Details on compact previews', () => {
    const story = article({ excerpt: 'A licensed excerpt.' })
    const { rerender } = render(<StoryCard article={story} variant="feature" now={NOW} />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Metro line opens in Bengaluru')
    expect(screen.getByText('A licensed excerpt.')).toBeInTheDocument()
    rerender(<StoryCard article={story} variant="row" now={NOW} />)
    expect(screen.queryByText('A licensed excerpt.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Details/ })).toBeInTheDocument()
    rerender(<StoryCard article={story} variant="compact" now={NOW} />)
    expect(screen.queryByRole('button', { name: /^Details/ })).not.toBeInTheDocument()
  })

  it('shows a credited picture, or EastWire\'s own labelled tile, never a bare frame', () => {
    const { rerender, container } = render(<StoryCard article={article()} image={null} now={NOW} />)
    // No matching photo: EastWire's graphic card, naming the source, and no photo credit.
    const card = container.querySelector('figure [data-country]')!
    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).getByText(article().publisher)).toBeInTheDocument()
    expect(screen.queryByText('Illustrative image')).toBeNull()
    rerender(
      <StoryCard
        article={article()}
        now={NOW}
        image={{
          id: 'x',
          src: 'https://upload.wikimedia.org/x.jpg',
          srcSet: '',
          alt: 'A street in Bengaluru',
          caption: 'Bengaluru',
          credit: 'A. Photographer',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
          filePage: 'https://commons.wikimedia.org/wiki/File:X.jpg',
          position: '50% 50%',
          label: 'Illustrative image',
        }}
      />,
    )
    expect(screen.getByRole('img', { name: 'A street in Bengaluru' })).toBeInTheDocument()
    expect(screen.getByText('Illustrative image')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /A. Photographer/ })).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:X.jpg')
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeInTheDocument()
    expect(container.querySelector('figure')).not.toBeNull()
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
    expect(screen.getByText('No sector rule matched this headline.')).toBeInTheDocument()
  })
})
