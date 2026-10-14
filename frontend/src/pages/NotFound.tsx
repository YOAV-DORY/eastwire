import clsx from 'clsx'
import { PageHeader } from '../components/layout/PageHeader'
import { ButtonLink } from '../components/ui/Button'
import { usePageTitle } from '../hooks/usePageTitle'
import styles from './NotFound.module.css'

export function NotFound() {
  usePageTitle('Page not found')
  return (
    <div className={clsx('container', styles.page)}>
      <PageHeader kicker="404" title="Page not found" lede="This address doesn't exist on EastWire. The latest stories are one click away." />
      <ButtonLink href="/" variant="primary" size="lg">
        Go to the front page
      </ButtonLink>
    </div>
  )
}
