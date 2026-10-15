import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { socialItem, VIDEO } from '../../test/fixtures'
import { SocialCard } from './SocialCard'

const NOW = new Date('2026-10-14T12:00:00Z')

afterEach(() => {
  document.querySelectorAll('script[src*="embed.bsky.app"]').forEach((s) => s.remove())
})

describe('SocialCard', () => {
  it('is labelled as a social post and says why the account is listed', () => {
    render(<SocialCard item={socialItem()} now={NOW} />)
    expect(screen.getByText('Bluesky post')).toBeInTheDocument()
    expect(screen.getByText('Why this account')).toBeInTheDocument()
    expect(screen.getByText('Invented newsroom for tests.')).toBeInTheDocument()
    expect(screen.getByText(/Bluesky · Newsroom ·/)).toBeInTheDocument()
    expect(screen.getByText('No matching report in our sources yet')).toBeInTheDocument()
  })

  it('loads nothing from Bluesky until asked, then uses the official embed', async () => {
    render(<SocialCard item={socialItem()} now={NOW} />)
    expect(document.querySelector('script[src*="embed.bsky.app"]')).toBeNull()
    expect(screen.getByText('Metro line opens in Bengaluru today').tagName).toBe('BLOCKQUOTE')

    await userEvent.click(screen.getByRole('button', { name: 'Load post from Bluesky' }))

    expect(document.querySelector('script[src="https://embed.bsky.app/static/embed.js"]')).not.toBeNull()
    const embed = document.querySelector('blockquote.bluesky-embed')!
    expect(embed.getAttribute('data-bluesky-uri')).toBe('at://did:plc:desk/app.bsky.feed.post/abc')
    expect(embed.getAttribute('data-bluesky-cid')).toBe('bafyabc')
  })

  it('shows a YouTube facade, then the privacy-enhanced player on request', async () => {
    render(<SocialCard item={VIDEO} now={NOW} />)
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByText('Inside the new metro')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Load video (YouTube may set cookies)' }))

    expect(document.querySelector('iframe')!.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/vid123')
    expect(screen.getByRole('link', { name: /Open on YouTube/ })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=vid123')
  })

  it('lists related reporting on request, never calling it verification', async () => {
    const item = socialItem({
      related: [
        { articleId: 9, title: 'Metro line opens', url: 'https://scroll.in/article/9/x', publisher: 'Scroll.in', linkType: 'shares_url' },
      ],
    })
    render(<SocialCard item={item} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: 'Related reporting: 1' }))
    expect(screen.getByRole('link', { name: /Metro line opens/ })).toHaveAttribute('href', 'https://scroll.in/article/9/x')
    expect(screen.getByText('Scroll.in · the post links to it')).toBeInTheDocument()
    expect(screen.queryByText(/verified(?! reporting)/i)).toBeNull()
  })
})
