import clsx from 'clsx'
import { Link } from 'react-router'
import { PageHeader } from '../components/layout/PageHeader'
import { usePageTitle } from '../hooks/usePageTitle'
import { PAGE_IMAGES } from '../lib/pageImages'
import { ArticleLayout, Section } from '../components/layout/ArticleLayout'
import styles from '../components/layout/ArticleLayout.module.css'
import own from './AboutPage.module.css'

const REPO = 'https://github.com/YOAV-DORY/eastwire/blob/main/docs'
import { CONTACT } from '../lib/links'

const SECTIONS = [
  { id: 'what', label: 'What EastWire is' },
  { id: 'who', label: 'Who runs it' },
  { id: 'ranking', label: 'How stories are selected' },
  { id: 'summaries', label: 'Automated summaries' },
  { id: 'verified', label: 'Not verified reporting' },
  { id: 'times', label: 'Dates and times' },
  { id: 'images', label: 'Images' },
  { id: 'places', label: 'Places and sectors' },
  { id: 'contact', label: 'Contact and corrections' },
] as const

/** /about: what EastWire is, who runs it, how stories are chosen, and what it is not. */
export function AboutPage() {
  usePageTitle('About EastWire')
  return (
    <div className={clsx('container', styles.page)}>
      <PageHeader
        image={PAGE_IMAGES.about}
        kicker="About EastWire"
        title="About EastWire"
        lede="A front page for news from China, India, South Korea and Japan: other outlets' headlines, chosen by published rules and linked to the original. Here is who runs it, how it works and what it is not."
      />

      <dl className={own.masthead} aria-label="Masthead">
        <div>
          <dt>Run by</dt>
          <dd>Yoav Dory, independently</dd>
        </div>
        <div>
          <dt>Funding</dt>
          <dd>None. Non-commercial, no ads, no tracking</dd>
        </div>
        <div>
          <dt>Selection</dt>
          <dd>Published rules, no human editor</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>
            <a href={CONTACT}>Open an issue on GitHub</a>
          </dd>
        </div>
      </dl>

      <ArticleLayout sections={SECTIONS}>
        <Section n={1} id="what" title="What EastWire is">
          <p>
            EastWire collects headlines from news sources in and about China, India, South Korea and Japan and puts
            them on one front page, a map and a search. Every story is the publisher&apos;s own headline, linked to
            their site, with our short summary where their terms allow one. We never republish or translate articles,
            and the only photos are licensed, credited illustrations.
          </p>
          <p>
            A source is used only after its terms have been read and recorded (for feeds we read directly, its robots
            rules too);{' '}
            <Link to="/sources">the Sources page</Link> lists each one, what it allows and how well it is working
            right now.
          </p>
          <p className={styles.aside}>
            EastWire shows what its listed sources published. It does not measure what any audience has or hasn&apos;t
            seen.
          </p>
        </Section>

        <Section n={2} id="who" title="Who runs it">
          <p>
            EastWire is built and run by Yoav Dory as an independent, non-commercial project. It is not affiliated with
            any publisher, government or platform shown here, and no one pays for placement. The code, the source list
            and every rule below are public on <a href="https://github.com/YOAV-DORY/eastwire">GitHub</a>.
          </p>
        </Section>

        <Section n={3} id="ranking" title="How stories are selected">
          <p>
            There is no human editor. The lead, the order of the front page and the map come from fixed, published
            rules, never from clicks or an AI. A story ranks higher when:
          </p>
          <ul>
            <li>
              <strong>several outlets</strong> report the same event (the card says how many);
            </li>
            <li>
              it has <strong>security or market weight</strong>: missiles, military moves, sanctions, central-bank
              decisions, record market moves;
            </li>
            <li>
              it is <strong>recent</strong> (a story&apos;s freshness score halves every 12 hours);
            </li>
            <li>
              it <strong>reaches beyond one country</strong>: another government, trade, climate, chips, or more than
              one of our countries.
            </li>
          </ul>
          <p>
            Routine market wraps, columns and reviews rank lower. To keep the page balanced, no country fills more than
            about 40% of the front page and no publisher more than 25%, counted from the top down, and the lead
            never comes from the same country twice in a row. Nothing is hidden to achieve this; stories only move
            down. Each event appears once on the home page, and the lead says why it leads.{' '}
            <a href={`${REPO}/ranking.md`}>The rules in full</a>.
          </p>
        </Section>

        <Section n={4} id="summaries" title="Automated summaries">
          <p>
            Some cards carry a one-line summary. It is <strong>written automatically</strong> by an open language model
            (Microsoft&apos;s Phi-3-mini) that runs on our own build machine, never a paid AI service. It works only from
            the short description the publisher&apos;s feed provides, and only for sources whose terms allow derived
            text: today Global Voices (CC BY 3.0), Sixth Tone and The Mainichi.
          </p>
          <p>
            Every summary passes automatic checks before it is shown: it may not copy five words in a row from the
            publisher, add a number, name, judgment or negation the source does not contain, or simply repeat the
            headline. Anything that fails is dropped, so most cards show the headline alone. No person reviews
            summaries before they appear; if one is wrong, <a href={CONTACT}>tell us</a>.{' '}
            <a href={`${REPO}/summaries.md`}>How summaries are written and checked</a>.
          </p>
        </Section>

        <Section n={5} id="verified" title="Not verified reporting">
          <p>
            EastWire does not report, fact-check or edit the news. Headlines are the publishers&apos; own words and
            claims are theirs; read the original before relying on a story. Publishers whose ownership matters to how a
            story should be read are labelled on every card, for example &ldquo;Chinese state media&rdquo; for Xinhua
            and &ldquo;South Korean government&rdquo; for Korea.net, each with a cited basis.
          </p>
          <p>
            Social posts and videos are shown only on the Social page, from a curated list of newsroom and official
            accounts, and are labelled &ldquo;not verified reporting&rdquo;.
          </p>
        </Section>

        <Section n={6} id="times" title="Dates and times">
          <p>
            <strong>Published</strong> is the publisher&apos;s own time; when a source gives none, or only the day, the
            card says &ldquo;found&rdquo; and when we first saw it instead of inventing an hour. &ldquo;Updated&rdquo;
            at the top of each page is when EastWire last refreshed its news, normally about once an hour. Each
            source&apos;s own checks are on <Link to="/sources#health">the Sources page</Link>.
          </p>
        </Section>

        <Section n={7} id="images" title="Images">
          <p>
            News photos from our sources are not licensed for reuse here, so EastWire never shows them. A story gets
            an <strong>illustrative image</strong> only when one clearly fits: a photograph of the city its headline
            names, or of the subject it names, from Wikimedia Commons under a licence that allows reuse with credit (CC0,
            CC BY or CC BY-SA). We read each file&apos;s page before using it, and the creator and licence are credited
            under the image.
          </p>
          <p>
            An illustrative image is labelled as such and is never a photo of the event reported. No image appears
            twice on a page. When nothing fits, the card shows EastWire&apos;s own graphic: the story&apos;s country,
            sector and source. <a href={`${REPO}/images.md`}>Every image and every rejected candidate</a>.
          </p>
        </Section>

        <Section n={8} id="places" title="Places and sectors">
          <p>
            A story is filed under a city or country only when that place is its main subject: named in the headline,
            the dateline, or the first place the article covers. Stories that only name a country are never pinned to
            its capital. <a href={`${REPO}/cities.md`}>How the city list is chosen</a>.
          </p>
          <p>
            Stories are tagged with up to two of six sectors by published keyword rules, the publisher&apos;s own topic
            tags and GDELT themes. Open a story&apos;s details to see the rules that matched, or read{' '}
            <Link to="/sectors">every rule and how accurate they are</Link>.
          </p>
        </Section>

        <Section n={9} id="contact" title="Contact and corrections">
          <p>
            For a wrong summary, a wrong place or sector, a broken link, or a publisher asking to be removed, please{' '}
            <a href={CONTACT}>open an issue on GitHub</a>. Removal requests are honoured on the next update and the
            story is deleted, not hidden.
          </p>
        </Section>
      </ArticleLayout>
    </div>
  )
}
