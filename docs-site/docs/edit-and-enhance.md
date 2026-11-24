---
id: edit-and-enhance
title: Edit and Enhance
sidebar_position: 3
slug: /edit-and-enhance
---

# Editing and Enhancing Documents

After capturing a document, OSS Document Scanner provides comprehensive editing tools to perfect your scans.

![Edit Screen](/img/screenshots/documentscanner/3_en-US.jpg)

## Rename

1. Open the document
2. click on the document name in the actionbar
3. rename the document
4. click the **Save** button

## Cropping and Rotation

### Manual Cropping

Fine-tune the document boundaries after capture:

1. Open the edit view for a scanned page
2. Select the **Crop** tool
3. Drag corner handles to adjust the document area
4. Drag edge midpoints for precise adjustments
5. Use the grid overlay for alignment
6. Tap **Apply** to save changes

### Rotation

Correct document orientation, tap the rotate button to rotate in 90° increments

### Perspective Correction

The app automatically applies perspective correction based on the detected document edges. This ensures:

- Parallel edges appear parallel
- Rectangular documents appear rectangular
- Text lines are straightened

## Image Filters

Apply filters to enhance document readability:

### Black & White

Converts to pure black and white (binary):

- Ideal for text documents
- Smallest file size
- Best for OCR processing
- Adjustable threshold for optimal results

### Grayscale

Removes color while preserving tonal range:

- Good for documents with diagrams
- Smaller file size than color
- Natural appearance

### Color Enhanced

Improves color documents:

- Automatic white balance
- Contrast enhancement
- Color saturation adjustment

### Original

Keeps the image as captured:

- Full color preservation
- No processing applied
- Largest file size

### Document Enhancement

Smart enhancement for documents:

- Shadow removal
- Uneven lighting correction
- Edge sharpening
- Background cleanup

## Advanced Adjustments

### Brightness and Contrast

Fine-tune image appearance:

1. Tap **Adjust** in the edit toolbar
2. Use sliders to adjust:
   - **Brightness**: Lighten or darken the image
   - **Contrast**: Increase or decrease tonal range
3. Preview changes in real-time
4. Tap **Apply** to save

## OCR (Optical Character Recognition)

Extract text from scanned documents:

### Running OCR

1. Open a document page
2. Tap the **OCR** button
3. Select the language(s) of the text
4. Wait for processing to complete
5. View and copy extracted text

### Detect and Copy (Android)

For quick text extraction, use the app shortcut action.

### OCR Features

- **Multi-language support**: OCR works with many languages
- **Copy text**: Copy extracted text to clipboard
- **Search**: Search within extracted text
- **Export**: Include OCR text in PDF exports
- **Transparent OCR in PDF**: Add searchable text layer to exported PDFs

### OCR Tips

- Use **Black & White** filter for best results
- Ensure good capture quality
- Select correct language(s)
- For handwriting, results may vary
- Download language models from **Settings** > **OCR** before use

:::note OCR Processing
OCR uses Tesseract for text recognition. Processing happens on-device for privacy. See `app/services/ocr.ts` for implementation details.
:::

## Page Management

### Reordering Pages

In multi-page documents:

1. Open the document view
    - Tap the **Reorder Pages** menu entry in the three dot action menu
    - or long-press and start dragging a page
2. Drag to the new position
3. Release to drop
4. The document is automatically saved

### Deleting Pages

Remove unwanted pages:

1. Open the document view
2. Select pages to delete (tap thumbnails)
3. Tap the **Delete** button
4. Confirm deletion

### Adding Pages

Add more pages to existing documents:

1. Open the document
2. Tap **Add Page** or **Camera** buttons
3. Capture new pages
4. Pages are appended to the document


## Best Practices

### For Text Documents

1. Use **Black & White** filter
2. Ensure high contrast
3. Run OCR for searchable PDFs
4. Use perspective correction

### For Photos/Diagrams

1. Use **Grayscale** or **Color Enhanced**
2. Adjust brightness/contrast as needed
3. Keep original resolution

### For Receipts

1. Use **Whitepaper**
2. Apply shadow removal
3. Increase contrast slightly
4. Consider Black & White for faded receipts
