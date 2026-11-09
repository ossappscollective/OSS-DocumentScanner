import { HttpsRequestOptions, request } from '@nativescript-community/https';
import { ApplicationSettings, File, Folder, Observable, Utils, knownFolders, path } from '@nativescript/core';
import { NoNetworkError } from '@akylas/nativescript-app-utils/error';
import { ocrDocumentFromFile } from 'plugin-nativeprocessor';
import type { OCRDocument } from '~/models/OCRDocument';
import { handleRequestResponseError, networkService, wrapNativeHttpException } from '~/services/api';
import { OCR_ITERATOR_LEVEL } from '~/utils/constants';

export const OCRLanguages = {
    afr: 'Afrikaans',
    amh: 'Amharic',
    ara: 'Arabic',
    asm: 'Assamese',
    aze: 'Azerbaijani',
    aze_cyrl: 'Azerbaijani-Cyrillic',
    bel: 'Belarusian',
    ben: 'Bengali',
    bod: 'Tibetan',
    bos: 'Bosnian',
    bul: 'Bulgarian',
    cat: 'Catalan;Valencian',
    ceb: 'Cebuano',
    ces: 'Czech',
    chi_sim: 'Chinese-Simplified',
    chi_sim_vert: 'Chinese-Simplified-Vertical',
    chi_tra: 'Chinese-Traditional',
    chi_tra_vert: 'Chinese-Traditional-Vertical',
    chr: 'Cherokee',
    cos: 'Corsican',
    cym: 'Welsh',
    dan: 'Danish',
    dan_frak: 'Danish Fraktur',
    deu: 'German',
    deu_frak: 'German Fraktur',
    div: 'Dhivehi; Divehi; Maldivian',
    dzo: 'Dzongkha',
    ell: 'Greek,Modern(1453-)',
    eng: 'English',
    enm: 'English,Modern(1453-)',
    epo: 'Esperanto',
    eqo: 'equation',
    est: 'Estonian',
    eus: 'Basque',
    fao: 'Faroese',
    fas: 'Persian',
    fil: 'Filipino:Pilipino',
    fin: 'Finnish',
    fra: 'French',
    frk: 'Frankish',
    frm: 'French,Middle(ca.1400-1600)',
    fry: 'Westtern Frisian',
    gla: 'Scottish Gaelic; Gaelic',
    gle: 'Irish',
    glg: 'Galician',
    grc: 'Greek,Ancient(-1453)',
    guj: 'Gujarati',
    hat: 'Haitian;Haitian Creole',
    heb: 'Hebrew',
    hin: 'Hindi',
    hrv: 'Croatian',
    hun: 'Hungarian',
    hye: 'Armenian',
    iku: 'Inuktitut',
    ind: 'Indonesian',
    isl: 'Icelandic',
    ita: 'Italian',
    ita_old: 'Italian-old',
    jav: 'Javanese',
    jpn: 'Japanese',
    jpn_vert: 'Japanese (vertical)',
    kan: 'Kannada',
    kat: 'Georgian',
    kat_old: 'Georgian-old',
    kaz: 'Kazakh',
    khm: 'Central Khmer',
    kir: 'Kirghiz; Kyrgyz',
    kmr: 'Northern Kurdish',
    kor: 'Korean',
    kor_vert: 'Korean (vertical)',
    kur: 'Kurdish',
    lao: 'Lao',
    lat: 'Latin',
    lav: 'Latvian',
    lit: 'Lithuanian',
    ltz: 'Luxembourgish; Letzeburgesch',
    mal: 'Malayalam',
    mar: 'Marathi',
    mkd: 'Macedonian',
    mlt: 'Maltese',
    mon: 'Mongolian',
    mri: 'Maori',
    msa: 'Malay',
    mya: 'Burmese',
    nep: 'Nepali',
    nld: 'Dutch; Flemish',
    nor: 'Norwegian',
    oci: 'Occitan (post 1500)',
    ori: 'Oriya',
    osd: 'OSD',
    pan: 'Panjabi;',
    'pdf.ttf': 'PDF',
    pol: 'Polish',
    por: 'Portuguese',
    pus: 'Pushto;',
    que: 'Quechua',
    ron: 'Romanian;Moldavian;Moldovan',
    rus: 'Russian',
    san: 'Sanskrit',
    sin: 'Sinhala; Sinhalese',
    slk: 'Slovak',
    slk_frak: 'Slovak Fraktur',
    slv: 'Slovenian',
    snd: 'Sindhi',
    spa: 'Spanish;Castilian',
    spa_old: 'Spanish; Castilian-Old',
    sqi: 'Albanian',
    srp: 'Serbian',
    srp_latn: 'Serbian-Latin',
    sun: 'Sundanese',
    swa: 'Swahili',
    swe: 'Swedish',
    syr: 'Syriac',
    tam: 'Tamil',
    tat: 'Tatar',
    tel: 'Telugu',
    tgk: 'Tajik',
    tgl: 'Tagalog',
    tha: 'Thai',
    tir: 'Tigrinya',
    ton: 'Tonga (Tonga Islands)',
    tur: 'Turkish',
    uig: 'Uighur;;Uyghur',
    ukr: 'Ukrainian',
    urd: 'Urdu',
    uzb: 'Uzbek',
    uzb_cyrl: 'Uzbek-Cyrillic',
    vie: 'Vietnamese',
    yid: 'Yiddish',
    yor: 'Yoruba'
};

const TAG = 'OCRService';

export class OCRService extends Observable {
    baseDataPath = ApplicationSettings.getString('tesseract_datapath_base', path.join(knownFolders.documents().path, 'tesseract'));
    currentDataPath: string;
    mLanguages: string;
    mDataType: 'best' | 'standard' | 'fast';
    mDownloadedLanguages: string[] = [];
    async start(defaultLanguage: string) {
        this.languages = ApplicationSettings.getString('tesseract_languages', defaultLanguage);
        this.dataType = ApplicationSettings.getString('tesseract_datatype', 'best') as any;
    }

    get downloadedLanguages() {
        return this.mDownloadedLanguages;
    }

    set languages(value) {
        this.mLanguages = value;
        ApplicationSettings.setString('tesseract_languages', value);
    }
    get languages() {
        return this.mLanguages;
    }
    get languagesArray() {
        return this.mLanguages.split('+');
    }

    updateDownloadedLanguages() {
        const setting = ApplicationSettings.getString(`tesseract_data_${this.mDataType}`, null);
        if (setting === null) {
            this.mDownloadedLanguages = Folder.fromPath(this.currentDataPath)
                .getEntitiesSync()
                .map((e) => e.name.split('.').slice(0, -1).join('.'));
            ApplicationSettings.setString(`tesseract_data_${this.mDataType}`, JSON.stringify(this.mDownloadedLanguages));
        } else {
            this.mDownloadedLanguages = JSON.parse(setting);
        }
        return this.mDownloadedLanguages;
    }
    set dataType(value) {
        this.mDataType = value;
        ApplicationSettings.setString('tesseract_datatype', value);
        this.currentDataPath = path.join(this.baseDataPath, value);
        this.updateDownloadedLanguages();
    }
    get dataType() {
        return this.mDataType;
    }
    get qualities() {
        return ['standard', 'best', 'fast'];
    }

    get availableLanguages() {
        return Object.keys(OCRLanguages);
    }

    addLanguages(...languages) {
        const array = this.languagesArray;
        let needsUpdate = false;
        for (let index = 0; index < languages.length; index++) {
            const language = languages[index];
            if (array.indexOf(language) === -1) {
                needsUpdate = true;
                array.push(language);
            }
        }
        if (needsUpdate) {
            this.languages = array.join('+');
        }
    }
    removeLanguages(...languages) {
        const array = this.languagesArray;
        let needsUpdate = false;
        for (let i = 0; i < languages.length; i++) {
            const language = languages[i];
            const index = array.indexOf(language);
            if (index !== -1) {
                needsUpdate = true;
                array.splice(index, 1);
            }
        }
        if (needsUpdate) {
            this.languages = array.join('+');
        }
    }

    async ocrPage({
        dataType,
        document,
        language = this.mLanguages,
        onProgress,
        pageIndex
    }: {
        language?: string;
        document: OCRDocument;
        pageIndex: number;
        onProgress?: (progress: number) => void;
        dataType?: string;
    }) {
        // TODO: do we need to apply colorMatrix to image before doing OCR?
        let dataPath = this.currentDataPath;
        if (dataType) {
            dataPath = path.join(this.baseDataPath, dataType);
        }

        return document.ocrPage({
            dataPath,
            language,
            pageIndex,
            onProgress
        });
    }

    async ocrImage({ dataType, imagePath, language = this.mLanguages, onProgress }: { language?: string; imagePath: string; onProgress?: (progress: number) => void; dataType?: string }) {
        // TODO: do we need to apply colorMatrix to image before doing OCR?
        let dataPath = this.currentDataPath;
        if (dataType) {
            dataPath = path.join(this.baseDataPath, dataType);
        }
        DEV_LOG && console.log('ocrImage', dataPath, language);

        return ocrDocumentFromFile(
            imagePath,
            {
                dataPath,
                language,
                // rotation: page.rotation,
                // oem: 0,
                detectContours: 0,
                iteratorLevel: OCR_ITERATOR_LEVEL,
                trim: false
            },
            onProgress
        );
    }

    async checkOrDownload({
        confirmDownload,
        dataType,
        languages,
        onProgress
    }: {
        dataType: string;
        languages: string;
        onProgress?: (progress) => Promise<void>;
        confirmDownload?: (toDownload) => Promise<boolean>;
    }) {
        const langArray = languages.split('+');
        const toDownload = [];
        const destinationFolder = Folder.fromPath(this.baseDataPath).getFolder(dataType);
        DEV_LOG && console.log('checkOrDownload', dataType, languages);
        for (let index = 0; index < langArray.length; index++) {
            const lang = langArray[index];
            if (!File.exists(path.join(destinationFolder.path, lang + '.traineddata'))) {
                toDownload.push(lang);
            }
        }
        if (toDownload.length) {
            const result = await confirmDownload(toDownload);
            if (result) {
                if (!networkService.connected) {
                    throw new NoNetworkError();
                }
                await this.downloadLanguages({ dataType, langArray: toDownload, onProgress });
            } else {
                return false;
            }
        }
        return true;
    }

    async downloadLanguages({ dataType, langArray, onProgress }: { dataType: string; langArray: string[]; onProgress?: (progress) => Promise<void> }) {
        let downloadURL;
        switch (dataType) {
            case 'best':
                downloadURL = 'https://github.com/tesseract-ocr/tessdata_best/raw/4.0.0/';
                break;
            case 'standard':
                downloadURL = 'https://github.com/tesseract-ocr/tessdata/raw/4.0.0/';
                break;
            default:
                downloadURL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/4.0.0/';
        }
        async function updateProgress(progress) {
            return onProgress?.(progress);
        }
        updateProgress(0);
        // TODO: show notification
        for (let index = 0; index < langArray.length; index++) {
            const lang = langArray[index];
            const url = downloadURL + lang + '.traineddata';
            const destinationFolder = Folder.fromPath(this.baseDataPath).getFolder(dataType);
            const destinationFile = path.join(destinationFolder.path, lang + '.traineddata');
            // outside of the scanned data folder, same volume so the final rename is atomic
            const partialFile = path.join(Folder.fromPath(this.baseDataPath).getFolder('tmp').path, `${dataType}_${lang}.traineddata`);
            const requestParams = {
                url,
                method: 'GET'
            } as HttpsRequestOptions;
            try {
                let currentProgress = 0;
                const result = await request({
                    ...requestParams,
                    progressOnMainThread: false,
                    onProgress(current, total) {
                        // total is -1 when the server sends no content length
                        if (total <= 0) {
                            return;
                        }
                        const progress = Math.round(((index + current / total) / langArray.length) * 100);
                        if (progress !== currentProgress) {
                            currentProgress = progress;
                            Utils.executeOnMainThread(() => {
                                updateProgress(progress);
                            });
                        }
                    }
                });
                await handleRequestResponseError(result, requestParams);
                await result.content.toFile(partialFile);
                if (result.contentLength > 0 && File.fromPath(partialFile).size !== result.contentLength) {
                    throw new Error(`incomplete download of ${lang}: ${File.fromPath(partialFile).size}/${result.contentLength} bytes`);
                }
                if (File.exists(destinationFile)) {
                    File.fromPath(destinationFile).remove();
                }
                File.fromPath(partialFile).renameSync(destinationFile);
                this.mDownloadedLanguages.push(lang);
                ApplicationSettings.setString(`tesseract_data_${this.mDataType}`, JSON.stringify(this.mDownloadedLanguages));
            } catch (error) {
                if (File.exists(partialFile)) {
                    File.fromPath(partialFile).remove();
                }
                throw wrapNativeHttpException(error, requestParams);
            }
        }
        await updateProgress(100);

        this.updateDownloadedLanguages();
    }
}
export const ocrService = new OCRService();
