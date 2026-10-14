import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, ButtonLink } from './Button'
import { Chip } from './Chip'
import { Sticker } from './Sticker'

describe('Button', () => {
  it('is a non-submitting button by default and fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Search</Button>)
    const button = screen.getByRole('button', { name: 'Search' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('blocks clicks and reports busy while loading, keeping its label for screen readers', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('ButtonLink', () => {
  it('is a real link, so navigation works without JavaScript', () => {
    render(<ButtonLink href="/map">Open map</ButtonLink>)
    expect(screen.getByRole('link', { name: 'Open map' })).toHaveAttribute('href', '/map')
  })
})

describe('Chip', () => {
  it('exposes its selected state as aria-pressed', () => {
    const { rerender } = render(<Chip>Technology</Chip>)
    expect(screen.getByRole('button', { name: 'Technology' })).toHaveAttribute('aria-pressed', 'false')
    rerender(<Chip selected>Technology</Chip>)
    expect(screen.getByRole('button', { name: 'Technology' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the text label next to the colored dot (color is never the only signal)', () => {
    render(<Chip dotColor="var(--sector-economy)">Economy</Chip>)
    expect(screen.getByRole('button')).toHaveTextContent('Economy')
  })

  it('shows a count when given one', () => {
    render(<Chip count={42}>India</Chip>)
    expect(screen.getByRole('button', { name: 'India 42' })).toBeInTheDocument()
  })
})

describe('Sticker', () => {
  it('renders its text', () => {
    render(<Sticker>New</Sticker>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })
})
