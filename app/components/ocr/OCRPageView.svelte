<script lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Canvas, CanvasView, Matrix, Paint, Style } from '@nativescript-community/ui-canvas';
    import { Color, TouchGestureEventData, Utils } from '@nativescript/core';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import { onDestroy } from 'svelte';
    import type { Writable } from 'svelte/store';
    import { OCRData } from 'plugin-nativeprocessor';
    import { Affine, OCRViewState, getBlockAt, getFitMatrix, multiply } from '~/components/ocr/OCROverlay';
    import { isEInk } from '~/helpers/theme';
    import { IMAGE_CONTEXT_OPTIONS, IMAGE_DECODE_HEIGHT } from '~/utils/constants';
    import { colors } from '~/variables';

    const dispatch = createEventDispatcher();

    let { colorBackground, colorOnBackground, colorPrimary } = $colors;
    $: ({ colorBackground, colorOnBackground, colorPrimary } = $colors);
    const visualState = isEInk ? colorBackground : 'black';
    const textColor = isEInk ? colorOnBackground : 'white';

    export let item: { pageIndex: number; imagePath: string; rotation: number; ocrData: OCRData };
    export let state: Writable<OCRViewState>;

    const TAP_SLOP = 10;
    const TAP_MAX_DURATION = 300;

    let canvasView: NativeViewElementNode<CanvasView>;
    // the zoom and pan of the image, from the zoom view
    let zoomMatrix: Affine = [1, 0, 0, 1, 0, 0];
    let touchStart: { x: number; y: number; time: number } = null;
    let zoomImage: NativeViewElementNode<any>;
    let polling = false;

    const drawMatrix = new Matrix();
    const boxPaint = new Paint();
    boxPaint.style = Style.STROKE;
    const fillPaint = new Paint();
    fillPaint.style = Style.FILL;
    const textPaint = new Paint();
    textPaint.style = Style.FILL;

    // a change of the shared state (selection, text on the image, new data) redraws
    $: if ($state) {
        canvasView?.nativeView?.invalidate();
    }

    function getFullMatrix(): Affine {
        const size = canvasView?.nativeView?.getActualSize();
        if (!size) {
            return null;
        }
        const { imageHeight, imageWidth } = item.ocrData;
        return multiply(getFitMatrix({ imageWidth, imageHeight, rotation: item.rotation, viewWidth: size.width, viewHeight: size.height }), zoomMatrix);
    }

    function onTransformChanged(event: { android?: android.graphics.Matrix; ios?: CGAffineTransform }) {
        if (event.android) {
            const values = Array.create('float', 9);
            event.android.getValues(values);
            // the matrix is in pixels, the canvas in dips
            const density = Utils.layout.getDisplayDensity();
            zoomMatrix = [values[0], values[3], values[1], values[4], values[2] / density, values[5] / density];
        } else if (event.ios) {
            zoomMatrix = [event.ios.a, event.ios.b, event.ios.c, event.ios.d, event.ios.tx, event.ios.ty];
        }
        canvasView?.nativeView?.invalidate();
    }

    // iOS: ui-zoomimage 4.6.20 does not send `transformChanged`: the transform is read at each frame while the view is on screen.
    // The layers which are on screen are read, not the views: an animated zoom (double tap) is already at its end in the views
    function getIOSTransform(): Affine {
        const scrollView = zoomImage?.nativeView?.nativeViewProtected;
        const zoomView = scrollView?.zoomView;
        if (!scrollView || !zoomView) {
            return null;
        }
        const onScreen = (layer) => (typeof layer.presentationLayer === 'function' ? layer.presentationLayer() : layer.presentationLayer) ?? layer;
        const scrollLayer = onScreen(scrollView.layer);
        const zoomLayer = onScreen(zoomView.layer);
        const scale = zoomLayer.frame.size.width / zoomView.bounds.size.width;
        return [scale, 0, 0, scale, zoomLayer.frame.origin.x - scrollLayer.bounds.origin.x, zoomLayer.frame.origin.y - scrollLayer.bounds.origin.y];
    }
    function pollTransform() {
        const transform = polling && getIOSTransform();
        if (!transform) {
            return;
        }
        if (transform.some((value, index) => Math.abs(value - zoomMatrix[index]) > 0.001)) {
            zoomMatrix = transform;
            canvasView?.nativeView?.invalidate();
        }
        requestAnimationFrame(pollTransform);
    }
    function onZoomImageLoaded() {
        if (__IOS__) {
            polling = true;
            pollTransform();
        }
    }
    onDestroy(() => (polling = false));

    function onCanvasDraw({ canvas }: { canvas: Canvas }) {
        const matrix = getFullMatrix();
        if (!matrix) {
            return;
        }
        const [a, b, c, d, tx, ty] = matrix;
        const values = [a, c, tx, b, d, ty, 0, 0, 1];
        if (__ANDROID__) {
            // a js array is not converted to a float[]
            const nativeValues = Array.create('float', 9);
            values.forEach((value, index) => (nativeValues[index] = value));
            drawMatrix.setValues(nativeValues);
        } else {
            drawMatrix.setValues(values);
        }
        boxPaint.setStrokeWidth(1.5 / Math.hypot(a, b));
        boxPaint.color = colorPrimary;
        canvas.save();
        canvas.concat(drawMatrix);
        item.ocrData.blocks.forEach((block, index) => {
            const { x, y, width, height } = block.box;
            const selected = $state.page === item.pageIndex && index === $state.block;
            fillPaint.color = new Color(colorPrimary).setAlpha(selected ? 110 : 40).hex;
            canvas.drawRect(x, y, x + width, y + height, fillPaint);
            canvas.drawRect(x, y, x + width, y + height, boxPaint);
            if ($state.showText) {
                drawBlockText(canvas, block, selected);
            }
        });
        canvas.restore();
    }

    // the lines of a block fill its box: the size comes from the height of a line, and shrinks when the widest line is too wide
    function drawBlockText(canvas: Canvas, block: OCRData['blocks'][number], selected: boolean) {
        const { x, y, width, height } = block.box;
        const lines = block.text.split('\n');
        const lineHeight = height / lines.length;
        fillPaint.color = new Color(visualState).setAlpha(selected ? 235 : 200).hex;
        canvas.drawRect(x, y, x + width, y + height, fillPaint);
        textPaint.color = textColor;
        textPaint.setTextSize(lineHeight * 0.8);
        const widest = Math.max(...lines.map((line) => textPaint.measureText(line)));
        if (widest > width) {
            textPaint.setTextSize(lineHeight * 0.8 * (width / widest));
        }
        lines.forEach((line, lineIndex) => canvas.drawText(line, x, y + (lineIndex + 1) * lineHeight - lineHeight * 0.2, textPaint));
    }

    // the zoom view keeps its touches: a tap is a touch which did not move
    function onTouch(event: TouchGestureEventData) {
        switch (event.action) {
            case 'down':
                touchStart = { x: event.getX(), y: event.getY(), time: Date.now() };
                break;
            case 'move':
                if (touchStart && Math.hypot(event.getX() - touchStart.x, event.getY() - touchStart.y) > TAP_SLOP) {
                    touchStart = null;
                }
                break;
            case 'up':
                if (touchStart && Date.now() - touchStart.time < TAP_MAX_DURATION) {
                    dispatch('blockSelected', { detail: getBlockAt(item.ocrData.blocks, getFullMatrix(), touchStart.x, touchStart.y) });
                }
                touchStart = null;
                break;
            default:
                touchStart = null;
        }
    }
</script>

<gridlayout {...$$restProps}>
    <zoomimage
        bind:this={zoomImage}
        backgroundColor={visualState}
        decodeWidth={IMAGE_DECODE_HEIGHT}
        ios:contextOptions={IMAGE_CONTEXT_OPTIONS}
        imageRotation={item.rotation}
        maxZoom={10}
        src={item.imagePath}
        stretch="aspectFit"
        on:loaded={onZoomImageLoaded}
        on:touch={onTouch}
        on:transformChanged={onTransformChanged}
    />
    <canvasview bind:this={canvasView} isUserInteractionEnabled={false} on:draw={onCanvasDraw} on:layoutChanged={() => canvasView?.nativeView?.invalidate()} />
</gridlayout>
