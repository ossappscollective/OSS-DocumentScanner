import clsx from 'clsx';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import Translate, { translate } from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import { APPS } from '../data/apps';
import styles from './index.module.css';

const SCANNER_FEATURES = [
    {
        icon: '📷',
        title: translate({ id: 'homepage.feature.scan.title', message: 'Smart scanning' }),
        text: translate({
            id: 'homepage.feature.scan.text',
            message: 'Automatic edge detection, bulk scan for books and receipts, import from photos or existing PDFs.'
        })
    },
    {
        icon: '✨',
        title: translate({ id: 'homepage.feature.enhance.title', message: 'Crisp, clean scans' }),
        text: translate({
            id: 'homepage.feature.enhance.text',
            message: 'Color or black & white filters, brightness and contrast, crop, rotate, reorder and merge pages.'
        })
    },
    {
        icon: '🔎',
        title: translate({ id: 'homepage.feature.ocr.title', message: 'Offline OCR' }),
        text: translate({
            id: 'homepage.feature.ocr.text',
            message: 'Search inside your documents and copy any text. Powered by Tesseract, models run on your device.'
        })
    },
    {
        icon: '🗂️',
        title: translate({ id: 'homepage.feature.organize.title', message: 'Organized for you' }),
        text: translate({
            id: 'homepage.feature.organize.text',
            message: 'Colored folders, tags, favorites and instant search to find any document in a tap.'
        })
    },
    {
        icon: '☁️',
        title: translate({ id: 'homepage.feature.sync.title', message: 'Sync your way' }),
        text: translate({
            id: 'homepage.feature.sync.text',
            message: 'WebDAV, Google Drive, OneDrive or a local folder. Your files, your servers, your choice.'
        })
    },
    {
        icon: '🔒',
        title: translate({ id: 'homepage.feature.privacy.title', message: 'Private by design' }),
        text: translate({
            id: 'homepage.feature.privacy.text',
            message: 'Everything is processed on your device. Password-protect PDFs. No ads, no tracking, no account.'
        })
    }
];

const CARDWALLET_FEATURES = [
    translate({ id: 'homepage.cardwallet.chip.cards', message: 'Loyalty, membership and transit cards' }),
    translate({ id: 'homepage.cardwallet.chip.barcode', message: 'Barcode & QR auto detection' }),
    translate({ id: 'homepage.cardwallet.chip.passbook', message: 'Passbook .pkpass support' }),
    translate({ id: 'homepage.cardwallet.chip.sides', message: 'Front and back scanning' }),
    translate({ id: 'homepage.cardwallet.chip.expiry', message: 'Expiry dates and balances' }),
    translate({ id: 'homepage.cardwallet.chip.sync', message: 'Private sync, no account' })
];

const FAQ = [
    {
        question: translate({ id: 'homepage.faq.free.question', message: 'Is OSS Document Scanner really free?' }),
        answer: translate({
            id: 'homepage.faq.free.answer',
            message: 'Yes. It is free and open source, with no ads, no account and no tracking. The code is public on GitHub and developed with the help of the community.'
        })
    },
    {
        question: translate({ id: 'homepage.faq.upload.question', message: 'Are my documents uploaded anywhere?' }),
        answer: translate({
            id: 'homepage.faq.upload.answer',
            message: 'No. Scanning, enhancing and OCR all happen on your device. Sync is optional and goes to storage you control: WebDAV, Google Drive, OneDrive or a local folder.'
        })
    },
    {
        question: translate({ id: 'homepage.faq.ocr.question', message: 'Does the OCR work offline?' }),
        answer: translate({
            id: 'homepage.faq.ocr.answer',
            message: 'Yes. Download the language models you need once, then recognize text without any connection. You can also generate searchable PDFs.'
        })
    },
    {
        question: translate({ id: 'homepage.faq.export.question', message: 'Which formats can I export?' }),
        answer: translate({
            id: 'homepage.faq.export.answer',
            message: 'PDF, JPEG and PNG. PDFs can be configured and protected with a password before you share them.'
        })
    },
    {
        question: translate({ id: 'homepage.faq.platforms.question', message: 'Which platforms are supported?' }),
        answer: translate({
            id: 'homepage.faq.platforms.answer',
            message: 'Android and iOS. On Android you can also install from IzzyOnDroid, GitHub releases or Obtainium.'
        })
    },
    {
        question: translate({ id: 'homepage.faq.cardwallet.question', message: 'What is OSS Card Wallet?' }),
        answer: translate({
            id: 'homepage.faq.cardwallet.answer',
            message: 'A companion app built on the same engine to scan and store loyalty cards, tickets, IDs and Passbook passes with their barcodes, in one private place.'
        })
    }
];

function Img({ path, ...props }) {
    return <img src={useBaseUrl(path)} decoding="async" {...props} />;
}

// Store screenshots exist per locale (copy-assets.sh falls back to en-US for missing ones)
function Shot({ app, index, alt, className, priority = false }) {
    const { i18n } = useDocusaurusContext();
    const storeLocale = i18n.localeConfigs[i18n.currentLocale]?.htmlLang ?? 'en-US';
    return (
        <Img
            path={`/img/screenshots/${app}/${index}_${storeLocale}.jpg`}
            alt={alt}
            width="1080"
            height="1920"
            className={className}
            loading={priority ? 'eager' : 'lazy'}
            fetchpriority={priority ? 'high' : undefined}
        />
    );
}

function StoreButtons({ app }) {
    return (
        <div className={styles.storeButtons}>
            <div className={styles.badgeRow}>
                <a
                    href={app.playStore}
                    target="_blank"
                    rel="noopener"
                    aria-label={translate({ id: 'homepage.store.play.aria', message: 'Get {name} on Google Play' }, { name: app.name })}
                >
                    <Img path="/img/store/google-play.svg" alt={translate({ id: 'homepage.store.play.alt', message: 'Get it on Google Play' })} height="56" width="189" />
                </a>
                <a
                    href={app.appStore}
                    target="_blank"
                    rel="noopener"
                    aria-label={translate({ id: 'homepage.store.appstore.aria', message: 'Download {name} on the App Store' }, { name: app.name })}
                >
                    <Img path="/img/store/app-store.svg" alt={translate({ id: 'homepage.store.appstore.alt', message: 'Download on the App Store' })} height="56" width="168" />
                </a>
            </div>
            <div className={clsx(styles.badgeRow, styles.altBadges)}>
                <a href={app.github} target="_blank" rel="noopener">
                    <Img path="/img/store/github.png" alt={translate({ id: 'homepage.store.github.alt', message: 'Get it on GitHub' })} height="40" width="135" />
                </a>
                <a href={app.izzyOnDroid} target="_blank" rel="noopener">
                    <Img path="/img/store/izzyondroid.png" alt={translate({ id: 'homepage.store.izzy.alt', message: 'Get it on IzzyOnDroid' })} height="40" width="136" />
                </a>
                <a href={app.obtainium} target="_blank" rel="noopener">
                    <Img path="/img/store/obtainium.png" alt={translate({ id: 'homepage.store.obtainium.alt', message: 'Get it on Obtainium' })} height="40" width="134" />
                </a>
            </div>
        </div>
    );
}

function Hero() {
    useBrokenLinks().collectAnchor('document-scanner');
    return (
        <header className={styles.hero} id="document-scanner">
            <div className={clsx('container', styles.heroGrid)}>
                <div className={styles.heroText}>
                    <Img
                        path="/img/icon-192.png"
                        alt={translate({ id: 'homepage.hero.iconAlt', message: 'OSS Document Scanner app icon' })}
                        width="72"
                        height="72"
                        className={styles.heroIcon}
                    />
                    <Heading as="h1" className={styles.heroTitle}>
                        <Translate id="homepage.hero.title">Free document scanner for Android & iOS</Translate>
                    </Heading>
                    <p className={styles.heroSubtitle}>
                        <Translate id="homepage.hero.subtitle">
                            Scan to PDF, find any text with offline OCR and keep everything private. Open source, no ads, no account.
                        </Translate>
                    </p>
                    <StoreButtons app={APPS.scanner} />
                    <ul className={styles.heroTrust}>
                        <li>
                            <Translate id="homepage.hero.trust.free">100% free</Translate>
                        </li>
                        <li>
                            <Translate id="homepage.hero.trust.noAds">No ads</Translate>
                        </li>
                        <li>
                            <Translate id="homepage.hero.trust.noTracking">No tracking</Translate>
                        </li>
                        <li>
                            <Translate id="homepage.hero.trust.openSource">Open source</Translate>
                        </li>
                    </ul>
                </div>
                <div className={styles.heroPhones}>
                    <Shot
                        app="documentscanner"
                        index={2}
                        alt={translate({ id: 'homepage.hero.shot.edges', message: 'Automatic edge detection in OSS Document Scanner' })}
                        className={clsx(styles.phone, styles.phoneLeft)}
                    />
                    <Shot
                        app="documentscanner"
                        index={1}
                        alt={translate({ id: 'homepage.hero.shot.library', message: 'Document library with folders, tags and search' })}
                        className={clsx(styles.phone, styles.phoneCenter)}
                        priority
                    />
                    <Shot
                        app="documentscanner"
                        index={4}
                        alt={translate({ id: 'homepage.hero.shot.search', message: 'Offline text search inside documents' })}
                        className={clsx(styles.phone, styles.phoneRight)}
                    />
                </div>
            </div>
        </header>
    );
}

function Gallery({ app, count, label, altPrefix }) {
    const indexes = Array.from({ length: count }, (_, idx) => idx + 1);
    return (
        <div className={styles.gallery} role="list" aria-label={label}>
            {indexes.map((index) => (
                <div key={index} role="listitem" className={styles.galleryItem}>
                    <Shot app={app} index={index} alt={`${altPrefix} ${index}`} className={styles.galleryImage} />
                </div>
            ))}
        </div>
    );
}

function ScannerFeatures() {
    return (
        <section className={styles.section}>
            <div className="container">
                <Heading as="h2" className={styles.sectionTitle}>
                    <Translate id="homepage.features.title">Everything you need to scan, search and organize</Translate>
                </Heading>
                <p className={styles.sectionLead}>
                    <Translate id="homepage.features.lead">One app to turn paper into clean, searchable PDFs, without handing your documents to anyone.</Translate>
                </p>
                <div className={styles.featureGrid}>
                    {SCANNER_FEATURES.map((feature) => (
                        <div key={feature.title} className={styles.featureCard}>
                            <span className={styles.featureIcon} aria-hidden="true">
                                {feature.icon}
                            </span>
                            <Heading as="h3">{feature.title}</Heading>
                            <p>{feature.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ScannerGallery() {
    return (
        <section className={clsx(styles.section, styles.sectionTinted)}>
            <div className="container">
                <Heading as="h2" className={styles.sectionTitle}>
                    <Translate id="homepage.gallery.title">See it in action</Translate>
                </Heading>
                <p className={styles.sectionLead}>
                    <Translate id="homepage.gallery.lead">From first scan to synced archive, in light or dark.</Translate>
                </p>
            </div>
            <Gallery
                app="documentscanner"
                count={8}
                label={translate({ id: 'homepage.gallery.label', message: 'OSS Document Scanner previews' })}
                altPrefix={translate({ id: 'homepage.gallery.altPrefix', message: 'OSS Document Scanner preview' })}
            />
        </section>
    );
}

function CardWallet() {
    useBrokenLinks().collectAnchor('cardwallet');
    return (
        <section className={styles.cardwallet} id="cardwallet">
            <div className={clsx('container', styles.heroGrid)}>
                <div className={styles.cardwalletPhones}>
                    <Shot
                        app="cardwallet"
                        index={6}
                        alt={translate({ id: 'homepage.cardwallet.shot.stack', message: 'Cards stacked in OSS Card Wallet' })}
                        className={clsx(styles.phone, styles.phoneLeft)}
                    />
                    <Shot
                        app="cardwallet"
                        index={1}
                        alt={translate({ id: 'homepage.cardwallet.shot.cards', message: 'All loyalty and membership cards in OSS Card Wallet' })}
                        className={clsx(styles.phone, styles.phoneCenter)}
                    />
                    <Shot
                        app="cardwallet"
                        index={4}
                        alt={translate({ id: 'homepage.cardwallet.shot.pass', message: 'Boarding pass imported in OSS Card Wallet' })}
                        className={clsx(styles.phone, styles.phoneRight)}
                    />
                </div>
                <div className={styles.heroText}>
                    <Img
                        path="/img/icon-cardwallet-192.png"
                        alt={translate({ id: 'homepage.cardwallet.iconAlt', message: 'OSS Card Wallet app icon' })}
                        width="72"
                        height="72"
                        className={styles.heroIcon}
                    />
                    <Heading as="h2" className={styles.heroTitle}>
                        <Translate id="homepage.cardwallet.title">Every card and pass in one private wallet</Translate>
                    </Heading>
                    <p className={styles.heroSubtitle}>
                        <Translate id="homepage.cardwallet.subtitle">
                            Scan loyalty cards, tickets and IDs, or import Passbook files. Barcodes are always bright and ready at the checkout.
                        </Translate>
                    </p>
                    <ul className={styles.chipList}>
                        {CARDWALLET_FEATURES.map((feature) => (
                            <li key={feature}>{feature}</li>
                        ))}
                    </ul>
                    <StoreButtons app={APPS.cardwallet} />
                    <Link className={styles.textLink} to={APPS.cardwallet.docsLink}>
                        <Translate id="homepage.cardwallet.guide">Card Wallet guide →</Translate>
                    </Link>
                </div>
            </div>
        </section>
    );
}

function OpenSource() {
    return (
        <section className={styles.section}>
            <div className={clsx('container', styles.center)}>
                <Heading as="h2" className={styles.sectionTitle}>
                    <Translate id="homepage.opensource.title">Free, open source, and private</Translate>
                </Heading>
                <p className={styles.sectionLead}>
                    <Translate id="homepage.opensource.lead">
                        No ads. No tracking. No lock-in. Read the code, send a fix, or translate the apps into your language.
                    </Translate>
                </p>
                <div className={styles.badges}>
                    <a href="https://github.com/ossappscollective/OSS-DocumentScanner/stargazers">
                        <img src="https://img.shields.io/github/stars/ossappscollective/OSS-DocumentScanner?style=flat" alt="GitHub stars" height="20" />
                    </a>
                    <a href="https://github.com/ossappscollective/OSS-DocumentScanner/blob/master/COPYING">
                        <img src="https://img.shields.io/github/license/ossappscollective/OSS-DocumentScanner" alt="License" height="20" />
                    </a>
                    <a href="https://github.com/ossappscollective/OSS-DocumentScanner/releases/">
                        <img src="https://img.shields.io/github/downloads/ossappscollective/OSS-DocumentScanner/total.svg" alt="Downloads" height="20" />
                    </a>
                    <a href="https://hosted.weblate.org/engage/oss-document-scanner/">
                        <img src="https://hosted.weblate.org/widgets/oss-document-scanner/-/svg-badge.svg" alt="Translation status" height="20" />
                    </a>
                </div>
            </div>
        </section>
    );
}

function Faq() {
    return (
        <section className={clsx(styles.section, styles.sectionTinted)} id="faq">
            <div className={clsx('container', styles.faqContainer)}>
                <Heading as="h2" className={styles.sectionTitle}>
                    <Translate id="homepage.faq.title">Frequently asked questions</Translate>
                </Heading>
                {FAQ.map((item) => (
                    <details key={item.question} className={styles.faqItem}>
                        <summary>{item.question}</summary>
                        <p>{item.answer}</p>
                    </details>
                ))}
                <p className={styles.center}>
                    <Translate id="homepage.faq.more" values={{ link: <Link to="/faq">{translate({ id: 'homepage.faq.moreLink', message: 'full FAQ' })}</Link> }}>
                        {'More answers in the {link}.'}
                    </Translate>
                </p>
            </div>
        </section>
    );
}

function Download() {
    useBrokenLinks().collectAnchor('download');
    return (
        <section className={styles.download} id="download">
            <div className={clsx('container', styles.downloadGrid)}>
                {[APPS.scanner, APPS.cardwallet].map((app) => (
                    <div key={app.name} className={styles.downloadCard}>
                        <Heading as="h2">{app.name}</Heading>
                        <StoreButtons app={app} />
                        <Link to={app.docsLink}>
                            <Translate id="homepage.download.guide">Read the guide →</Translate>
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}

function Community() {
    return (
        <section className={styles.section}>
            <div className={clsx('container', styles.center)}>
                <Heading as="h2" className={styles.sectionTitle}>
                    <Translate id="homepage.community.title">Built by the community</Translate>
                </Heading>
                <p className={styles.sectionLead}>
                    <Translate id="homepage.community.lead">Thank you to everyone who sponsors, translates and contributes.</Translate>
                </p>
                <img
                    src="https://raw.githubusercontent.com/farfromrefug/sponsorkit/main/sponsors.svg"
                    alt={translate({ id: 'homepage.community.sponsorsAlt', message: 'Sponsors' })}
                    className={styles.sponsorsImage}
                    loading="lazy"
                />
                <div className={styles.buttonRow}>
                    <a className="button button--primary button--lg" href="https://github.com/sponsors/farfromrefug">
                        <Translate id="homepage.community.sponsor">Sponsor on GitHub</Translate>
                    </a>
                    <a className="button button--outline button--primary button--lg" href="https://opencollective.com/oss-appscollective">
                        Open Collective
                    </a>
                    <a className="button button--outline button--primary button--lg" href="https://hosted.weblate.org/engage/oss-document-scanner/">
                        <Translate id="homepage.community.translate">Help translate</Translate>
                    </a>
                    <Link className="button button--outline button--primary button--lg" to="/contributing">
                        <Translate id="homepage.community.contribute">Contribute</Translate>
                    </Link>
                </div>
            </div>
        </section>
    );
}

function StructuredData() {
    const { siteConfig } = useDocusaurusContext();
    const iconUrl = (name) => `${siteConfig.url}/img/${name}`;
    const application = (app, description, icon, applicationCategory) => ({
        '@type': 'MobileApplication',
        name: app.name,
        description,
        operatingSystem: 'Android, iOS',
        applicationCategory,
        image: iconUrl(icon),
        downloadUrl: app.playStore,
        installUrl: app.appStore,
        license: 'https://opensource.org/license/mit',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: { '@type': 'Organization', name: 'Akylas' }
    });
    const data = {
        '@context': 'https://schema.org',
        '@graph': [
            application(
                APPS.scanner,
                translate({
                    id: 'homepage.jsonld.scanner',
                    message: 'Free and open source document scanner with automatic edge detection, offline OCR, PDF export and sync. No ads, no tracking.'
                }),
                'icon-192.png',
                'BusinessApplication'
            ),
            application(
                APPS.cardwallet,
                translate({
                    id: 'homepage.jsonld.cardwallet',
                    message: 'Free and open source wallet for loyalty cards, tickets and Passbook passes, with barcode scanning and private sync.'
                }),
                'icon-cardwallet-192.png',
                'UtilitiesApplication'
            ),
            {
                '@type': 'FAQPage',
                mainEntity: FAQ.map((item) => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: { '@type': 'Answer', text: item.answer }
                }))
            }
        ]
    };
    return (
        <Head>
            <script type="application/ld+json">{JSON.stringify(data)}</script>
        </Head>
    );
}

export default function Home() {
    return (
        <Layout
            title={translate({ id: 'homepage.meta.title', message: 'Free Document Scanner App for Android & iOS' })}
            description={translate({
                id: 'homepage.meta.description',
                message: 'Free, open source document scanner for Android & iOS. Scan to PDF with auto edge detection, offline OCR and sync. No ads, no tracking, no account.'
            })}
        >
            <StructuredData />
            <Hero />
            <main>
                <ScannerFeatures />
                <ScannerGallery />
                <CardWallet />
                <OpenSource />
                <Faq />
                <Download />
                <Community />
            </main>
        </Layout>
    );
}
