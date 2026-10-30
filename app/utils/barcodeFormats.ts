/** the barcode formats of the app, the values are the names of the native formats. In its own module: it needs no native code */
export enum BARCODE_FORMATS {
    QR_CODE = 'QRCode',
    EAN_8 = 'EAN-8',
    EAN_13 = 'EAN-13',
    UPC_A = 'UPC-A',
    UPC_E = 'UPC-E',
    AZTEC = 'Aztec',
    CODABAR = 'Codabar',
    CODE_39 = 'Code39',
    CODE_93 = 'Code93',
    CODE_128 = 'Code128',
    DATABAR = 'DataBar',
    DATABAREXPANDED = 'DataBarExpanded',
    DATA_MATRIX = 'DataMatrix',
    // DXFILMEDGE = 'DXFilmEdge',
    ITF = 'ITF',
    MAXICODE = 'MaxiCode',
    MICROQRCODE = 'MicroQRCode',
    PDF_417 = 'PDF417',
    RMQRCODE = 'rMQRCode'
}
