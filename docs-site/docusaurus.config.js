// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'OSS Apps',
    tagline: 'Free, open source document scanner and card wallet apps for Android & iOS. No ads, 100% privacy.',
    // Icons are copied from fastlane by scripts/copy-assets.sh
    favicon: 'img/icons/documentscanner-icon.png',

    // Set the production url of your site here
    url: 'https://ossdocumentscanner.akylas.fr',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'OSS-DocumentScanner', // Usually your GitHub org/user name.
    projectName: 'OSS-DocumentScanner', // Usually your repo name.
    trailingSlash: false,

    onBrokenLinks: 'throw',

    markdown: {
        format: 'mdx'
    },

    // SEO metadata
    headTags: [
        {
            tagName: 'meta',
            attributes: {
                name: 'keywords',
                content:
                    'document scanner, pdf scanner, free document scanner app, best document scanner android, best document scanner ios, open source scanner, ocr app, scan to pdf, mobile scanner, cardwallet, loyalty card app, barcode scanner'
            }
        },
        {
            tagName: 'meta',
            attributes: {
                name: 'author',
                content: 'Akylas'
            }
        },
        {
            tagName: 'meta',
            attributes: {
                name: 'theme-color',
                content: '#2FBF71'
            }
        },
        {
            tagName: 'link',
            attributes: {
                rel: 'apple-touch-icon',
                href: '/img/icons/documentscanner-icon.png'
            }
        }
    ],

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en', 'fr'],
        localeConfigs: {
            en: {
                label: 'English',
                htmlLang: 'en-US'
            },
            fr: {
                label: 'Français',
                htmlLang: 'fr-FR'
            },
            es: {
                label: 'Español',
                htmlLang: 'es-ES'
            },
            de: {
                label: 'Deutsch',
                htmlLang: 'de-DE'
            }
        }
    },

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    routeBasePath: '/',
                    sidebarPath: './sidebars.js',
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl: 'https://github.com/ossappscollective/OSS-DocumentScanner/tree/main/docs-site/'
                },
                blog: false,
                theme: {
                    customCss: './src/css/custom.css'
                }
            })
        ]
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            // Scanner feature graphic, copied by scripts/copy-assets.sh
            image: 'img/apps/documentscanner-feature.png',
            navbar: {
                title: 'OSS Apps',
                logo: {
                    alt: 'OSS Apps Logo',
                    src: 'img/icons/documentscanner-icon.png'
                },
                items: [
                    {
                        type: 'dropdown',
                        label: 'Document Scanner',
                        to: '/#document-scanner',
                        position: 'left',
                        items: [
                            {
                                to: '/getting-started',
                                label: 'Getting Started'
                            },
                            {
                                to: '/capture',
                                label: 'Capture'
                            },
                            {
                                to: '/edit-and-enhance',
                                label: 'Edit & Enhance'
                            },
                            {
                                to: '/export',
                                label: 'Export'
                            }
                        ]
                    },
                    {
                        type: 'dropdown',
                        label: 'CardWallet',
                        to: '/#cardwallet',
                        position: 'left',
                        items: [
                            {
                                to: '/cardwallet/getting-started',
                                label: 'Getting Started'
                            },
                            {
                                to: '/cardwallet/scanning-cards',
                                label: 'Scanning Cards'
                            },
                            {
                                to: '/cardwallet/managing-cards',
                                label: 'Managing Cards'
                            }
                        ]
                    },
                    {
                        to: '/sync-and-backup',
                        label: 'Sync & Backup',
                        position: 'left'
                    },
                    {
                        to: '/settings',
                        label: 'Settings',
                        position: 'left'
                    },
                    {
                        type: 'localeDropdown',
                        position: 'right'
                    },
                    {
                        href: 'https://github.com/ossappscollective/OSS-DocumentScanner',
                        label: 'GitHub',
                        position: 'right'
                    },
                    {
                        to: '/#download',
                        label: 'Get the apps',
                        position: 'right',
                        className: 'navbar-cta'
                    }
                ]
            },
            footer: {
                style: 'dark',
                links: [
                    {
                        title: 'Document Scanner',
                        items: [
                            {
                                label: 'Getting Started',
                                to: '/getting-started'
                            },
                            {
                                label: 'Capture',
                                to: '/capture'
                            },
                            {
                                label: 'Export',
                                to: '/export'
                            }
                        ]
                    },
                    {
                        title: 'CardWallet',
                        items: [
                            {
                                label: 'Getting Started',
                                to: '/cardwallet/getting-started'
                            },
                            {
                                label: 'Scanning Cards',
                                to: '/cardwallet/scanning-cards'
                            },
                            {
                                label: 'Managing Cards',
                                to: '/cardwallet/managing-cards'
                            }
                        ]
                    },
                    {
                        title: 'Community',
                        items: [
                            {
                                label: 'GitHub Issues',
                                href: 'https://github.com/ossappscollective/OSS-DocumentScanner/issues'
                            },
                            {
                                label: 'Weblate Translations',
                                href: 'https://hosted.weblate.org/engage/oss-document-scanner/'
                            },
                            {
                                label: 'Sponsor',
                                href: 'https://github.com/sponsors/farfromrefug'
                            },
                            {
                                label: 'Open Collective',
                                href: 'https://opencollective.com/oss-appscollective'
                            }
                        ]
                    },
                    {
                        title: 'Download',
                        items: [
                            {
                                label: 'GitHub Releases',
                                href: 'https://github.com/ossappscollective/OSS-DocumentScanner/releases'
                            },
                            {
                                label: 'Google Play (Scanner)',
                                href: 'https://play.google.com/store/apps/details?id=com.akylas.documentscanner'
                            },
                            {
                                label: 'Google Play (CardWallet)',
                                href: 'https://play.google.com/store/apps/details?id=com.akylas.cardwallet'
                            },
                            {
                                label: 'App Store (Scanner)',
                                href: 'https://apps.apple.com/us/app/oss-document-scanner/id6472918564'
                            },
                            {
                                label: 'App Store (CardWallet)',
                                href: 'https://apps.apple.com/app/oss-cardwallet/id6504414362'
                            }
                        ]
                    },
                    {
                        title: 'Privacy',
                        items: [
                            {
                                label: 'Privacy policy',
                                href: 'https://www.akylas.fr/privacy'
                            }
                        ]
                    }
                ],
                copyright: `Copyright © ${new Date().getFullYear()} OSS Document Scanner & CardWallet. Built with Docusaurus.`
            },
            prism: {
                theme: prismThemes.github,
                darkTheme: prismThemes.dracula
            },
            colorMode: {
                defaultMode: 'light',
                disableSwitch: false,
                respectPrefersColorScheme: true
            }
        })
};

export default config;
