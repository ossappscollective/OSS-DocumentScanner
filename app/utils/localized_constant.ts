import { lc } from '~/helpers/locale';

export const TRANSFORMS = [
    { id: 'enhance', name: lc('enhance'), subtitle: lc('enhance_desc') },
    { id: 'whitepaper', name: lc('whitepaper'), subtitle: lc('whitepaper_desc') },
    { id: 'color', name: lc('color'), subtitle: lc('color_desc') }
];

export const PDF_OPTIONS = {
    orientation: {
        portrait: { name: lc('portrait') },
        landscape: { name: lc('landscape') }
    },
    paper_size: {
        full: { name: lc('full') },
        a4: { name: lc('a4') },
        a3: { name: lc('a3') },
        a5: { name: lc('a5') },
        letter: { name: lc('letter') }
    },
    color: {
        color: { name: lc('color') },
        black_white: { name: lc('black_white') }
    },
    items_per_page: {
        1: { name: 1 },
        2: { name: 2 },
        3: { name: 3 },
        4: { name: 4 },
        5: { name: 5 },
        6: { name: 6 }
    }
};
