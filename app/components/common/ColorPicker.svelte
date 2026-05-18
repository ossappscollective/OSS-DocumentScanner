<style lang="scss">
    .header {
        color: var(--colorOnBackground);
        font-weight: bold;
        font-size: 15;
        padding: 10 0 4 0;
    }
</style>

<script context="module" lang="ts">
    import { ApplicationSettings, Color, TapGestureEventData, Utils } from '@nativescript/core';

    import { Align, Canvas, LinearGradient, Paint, RectF, Style, TileMode } from '@nativescript-community/ui-canvas';

    import { lc, lu } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { closeBottomSheet } from '@nativescript-community/ui-material-bottomsheet/svelte';
    import { onMount } from 'svelte';
    import { colors, screenWidthDips } from '~/variables';
    const SLIDER_HEIGHT = 32;
    const THUMB_RADIUS = 14;
    const MAIN_COLOR_SIZE = 70;
    const SAVED_THUMB_RADIUS = MAIN_COLOR_SIZE / 2 / 2;
    const paint = new Paint();
    const strokePaint = new Paint();
    strokePaint.setStyle(Style.STROKE);
    strokePaint.setStrokeWidth(3);

    const SETTINGS_COLORS_SAVED = 'color_picker_saved';
</script>

<script lang="ts">
    import { Pager } from '@nativescript-community/ui-pager';
    import { chunk } from '@shared/utils/batch';

    let { colorBackground, colorError, colorOnBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant, colorSurface, colorSurfaceContainerHigh, colorTertiary } = $colors;
    $: ({ colorBackground, colorError, colorOnBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant, colorSurface, colorSurfaceContainerHigh, colorTertiary } = $colors);

    interface HSVA {
        h: number;
        s: number;
        v: number;
        a: number;
    }

    export let modes = ['grid' /* , 'spectrum' */, 'hue', 'sliders'];

    export let mode: 'grid' | 'spectrum' | 'sliders' | 'hue' = 'grid';

    DEV_LOG && console.log('ColorPicker', modes, mode);

    const tabs = [
        { id: 'grid', title: lc('grid') },
        { id: 'spectrum', title: lc('spectrum') },
        { id: 'hue', title: lc('hue') },
        { id: 'sliders', title: lc('sliders') }
    ].filter((t) => modes.indexOf(t.id) !== -1);
    DEV_LOG && console.log('tabs', tabs);

    let spectrumCanvas: NativeViewElementNode<CanvasView>;
    let hvSquare: NativeViewElementNode<CanvasView>; // Add this
    let hueBarCanvas: NativeViewElementNode<CanvasView>; // Add this
    let alphaCanvas: NativeViewElementNode<CanvasView>;
    let redCanvas: NativeViewElementNode<CanvasView>;
    let greenCanvas: NativeViewElementNode<CanvasView>;
    let blueCanvas: NativeViewElementNode<CanvasView>;
    let gridCanvas: NativeViewElementNode<CanvasView>;
    let colorsPager: NativeViewElementNode<Pager>;

    export let color: Color | string = 'red';
    export let alphaSupport = true;
    let currentColor: Color = color instanceof Color ? color : new Color(color);

    let hsva: HSVA = {
        h: 210,
        s: 1,
        v: 1,
        a: 1
    };
    updateFromHex();

    let saved: string[] = JSON.parse(ApplicationSettings.getString(SETTINGS_COLORS_SAVED, '["black","blue", "green", "orange", "red", "pink"]'));
    let savedPerPage = Math.floor((screenWidthDips - 60) / (2 * SAVED_THUMB_RADIUS)) * 2;
    $: pagedSavedColors = chunk(saved.concat('add'), savedPerPage);

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    onMount(() => {
        savedPerPage = Math.floor((screenWidthDips - 60) / (2 * SAVED_THUMB_RADIUS)) * 2;
    });

    function hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;

        let r = 0,
            g = 0,
            b = 0;

        if (h < 60) [r, g, b] = [c, x, 0];
        else if (h < 120) [r, g, b] = [x, c, 0];
        else if (h < 180) [r, g, b] = [0, c, x];
        else if (h < 240) [r, g, b] = [0, x, c];
        else if (h < 300) [r, g, b] = [x, 0, c];
        else [r, g, b] = [c, 0, x];

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        let h = 0;
        const v = max;
        const d = max - min;

        const s = max === 0 ? 0 : d / max;

        if (max !== min) {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return { h: h * 360, s, v };
    }

    function rgbaToHex(r, g, b, a) {
        const toHex = (c) => c.toString(16).padStart(2, '0');
        return '#' + toHex(r) + toHex(g) + toHex(b) + toHex(Math.round(a * 255));
    }

    function currentRgb(value = hsva) {
        return hsvToRgb(hsva.h, hsva.s, hsva.v);
    }

    function hsvaToHex(value = hsva) {
        const rgb = currentRgb(value);
        return rgbaToHex(rgb.r, rgb.g, rgb.b, hsva.a);
    }

    function updateHex() {
        currentColor = new Color(hsvaToHex());
        invalidateAll();
    }

    function updateFromHex() {
        const clean = currentColor.hex.replace('#', '');

        if (clean.length !== 6 && clean.length !== 8) {
            return;
        }

        const r = parseInt(clean.substring(0, 2), 16);

        const g = parseInt(clean.substring(2, 4), 16);

        const b = parseInt(clean.substring(4, 6), 16);

        let a = 1;

        if (clean.length === 8) {
            a = parseInt(clean.substring(6, 8), 16) / 255;
        }

        const hsv = rgbToHsv(r, g, b);

        hsva = {
            h: hsv.h,
            s: hsv.s,
            v: hsv.v,
            a
        };

        invalidateAll();
    }

    function invalidateAll() {
        spectrumCanvas?.nativeView.invalidate();
        hueBarCanvas?.nativeView.invalidate();
        hvSquare?.nativeView.invalidate();
        alphaCanvas?.nativeView.invalidate();
        redCanvas?.nativeView.invalidate();
        greenCanvas?.nativeView.invalidate();
        blueCanvas?.nativeView.invalidate();
        gridCanvas?.nativeView.invalidate();
    }

    /* ----------------------------
    SPECTRUM
---------------------------- */

    const WHITE_STOP = 0.38;
    const BLACK_STOP = 1 - WHITE_STOP;

    function spectrumToColor(t: number) {
        // white -> pure color
        if (t <= WHITE_STOP) {
            return {
                s: t / WHITE_STOP,
                v: 1
            };
        }

        // pure color -> black
        const normalized = (t - WHITE_STOP) / (1 - WHITE_STOP);

        return {
            s: 1,
            v: 1 - normalized
        };
    }

    function colorToSpectrumX(h: number, s: number, v: number, targetRgb: { r: number; g: number; b: number }) {
        // Candidate 1: Keep saturation, force to full brightness (V=1)
        // This sits on the White -> Pure Color segment
        const rgb1 = hsvToRgb(h, s, 1);
        const dist1 = Math.abs(rgb1.r - targetRgb.r) + Math.abs(rgb1.g - targetRgb.g) + Math.abs(rgb1.b - targetRgb.b);

        // Candidate 2: Keep brightness, force to full saturation (S=1)
        // This sits on the Pure Color -> Black segment
        const rgb2 = hsvToRgb(h, 1, v);
        const dist2 = Math.abs(rgb2.r - targetRgb.r) + Math.abs(rgb2.g - targetRgb.g) + Math.abs(rgb2.b - targetRgb.b);

        if (dist1 <= dist2) {
            // Closer to the white->color side
            return s * WHITE_STOP;
        } else {
            // Closer to the color->black side
            return WHITE_STOP + (1 - v) * (1 - WHITE_STOP);
        }
    }

    function drawSpectrum(args) {
        const canvas: Canvas = args.canvas;
        const w = canvas.getWidth();
        const h = canvas.getHeight();

        const hueGradient = new LinearGradient(
            0,
            0,
            0,
            h,
            [new Color('#ff0000'), new Color('#ffff00'), new Color('#00ff00'), new Color('#00ffff'), new Color('#0000ff'), new Color('#ff00ff'), new Color('#ff0000')],
            null,
            TileMode.CLAMP
        );

        paint.setShader(hueGradient);

        canvas.drawRect(new RectF(0, 0, w, h), paint);

        const valueGradient = new LinearGradient(0, 0, w, 0, [new Color('#ffffffff'), new Color('#ffffff00'), new Color('#000000ff')], [0, WHITE_STOP, 1], TileMode.CLAMP);

        paint.setShader(valueGradient);

        canvas.drawRect(new RectF(0, 0, w, h), paint);

        paint.setShader(null);

        /* ----------------------------
            THUMB POSITION
            exact inverse mapping using RGB distance
        ---------------------------- */
        const rgb = currentRgb(); // Add this line

        // Update this line to pass h, s, v, and rgb
        const x = colorToSpectrumX(hsva.h, hsva.s, hsva.v, rgb) * w;
        const y = (hsva.h / 360) * h;

        paint.setStyle(Style.FILL);
        paint.setColor(new Color(hsvaToHex()));

        canvas.drawCircle(x, y, THUMB_RADIUS - 2, paint);

        strokePaint.setColor(new Color('white'));

        canvas.drawCircle(x, y, THUMB_RADIUS - 2, strokePaint);
    }

    function onSpectrumTouch(args) {
        const canvas = args.object as CanvasView;

        if (__ANDROID__ && args.action !== 'up') {
            args.view?.parent?.nativeViewProtected.requestDisallowInterceptTouchEvent(true);
        }

        const w = Math.floor(Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredWidth()));

        const h = Math.floor(Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredHeight()));

        const x = clamp(args.getX(), 0, w);
        const y = clamp(args.getY(), 0, h);

        const t = x / w;

        const result = spectrumToColor(t);

        hsva.s = clamp(result.s, 0, 1);
        hsva.v = clamp(result.v, 0, 1);

        hsva.h = clamp((y / h) * 360, 0, 360);

        updateHex();
    }

    /* ----------------------------
        SATURATION / VALUE SQUARE
    ---------------------------- */

    function drawSvSquare(args) {
        const canvas: Canvas = args.canvas;
        const w = canvas.getWidth();
        const h = canvas.getHeight();

        // 1. Base layer: The current Pure Hue
        const pureColor = hsvToRgb(hsva.h, 1, 1);
        paint.setStyle(Style.FILL);
        paint.setColor(new Color(255, pureColor.r, pureColor.g, pureColor.b));
        canvas.drawRect(new RectF(0, 0, w, h), paint);

        // 2. Overlay White gradient (Left to Right: White -> Transparent)
        const whiteGradient = new LinearGradient(0, 0, w, 0, [new Color('#ffffffff'), new Color('#ffffff00')], null, TileMode.CLAMP);
        paint.setShader(whiteGradient);
        canvas.drawRect(new RectF(0, 0, w, h), paint);

        // 3. Overlay Black gradient (Top to Bottom: Transparent -> Black)
        const blackGradient = new LinearGradient(0, 0, 0, h, [new Color('#00000000'), new Color('#000000ff')], null, TileMode.CLAMP);
        paint.setShader(blackGradient);
        canvas.drawRect(new RectF(0, 0, w, h), paint);

        // THUMB POSITION (Exact 1:1 mathematical mapping - no guessing!)
        const x = hsva.s * w;
        const y = (1 - hsva.v) * h; // Top is V=1, Bottom is V=0

        paint.setShader(null);
        paint.setStyle(Style.FILL);
        paint.setColor(new Color(hsvaToHex()));
        canvas.drawCircle(x, y, THUMB_RADIUS - 2, paint);

        strokePaint.setColor(new Color('white'));
        canvas.drawCircle(x, y, THUMB_RADIUS - 2, strokePaint);
    }

    function onSvSquareTouch(args) {
        const canvas = args.object as CanvasView;
        if (__ANDROID__ && args.action !== 'up') {
            args.view?.parent?.nativeViewProtected.requestDisallowInterceptTouchEvent(true);
        }

        const w = Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredWidth());
        const h = Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredHeight());

        const x = clamp(args.getX(), 0, w);
        const y = clamp(args.getY(), 0, h);

        hsva.s = x / w;
        hsva.v = 1 - y / h; // Invert Y so bottom is dark

        updateHex();
    }

    /* ----------------------------
        HUE BAR (Vertical Rainbow)
    ---------------------------- */

    function drawHueBar(args) {
        const canvas: Canvas = args.canvas;
        const w = canvas.getWidth();
        const h = canvas.getHeight();

        const width = canvas.getWidth();
        const height = canvas.getHeight();
        const thumbRadius = height / 2 - 4;

        const hueGradient = new LinearGradient(
            0,
            0,
            w,
            0,
            [new Color('#ff0000'), new Color('#ffff00'), new Color('#00ff00'), new Color('#00ffff'), new Color('#0000ff'), new Color('#ff00ff'), new Color('#ff0000')],
            null,
            TileMode.CLAMP
        );

        paint.setShader(hueGradient);
        canvas.drawRoundRect(new RectF(0, 0, w, h), SLIDER_HEIGHT / 2, SLIDER_HEIGHT / 2, paint);

        // Thumb Indicator
        const rawX = (hsva.h / 360) * w;
        paint.setShader(null);

        const x = clamp(rawX, thumbRadius + 4, width - thumbRadius - 4);

        // Inner color dot
        const rgb = hsvToRgb(hsva.h, 1, 1);
        paint.setStyle(Style.FILL);
        paint.setColor(new Color(255, rgb.r, rgb.g, rgb.b));
        canvas.drawCircle(x, height / 2, thumbRadius, paint);

        // Outer white ring
        strokePaint.setColor(new Color('white'));
        canvas.drawCircle(x, height / 2, thumbRadius, strokePaint);
    }

    function onHueBarTouch(args) {
        const canvas = args.object as CanvasView;
        if (__ANDROID__ && args.action !== 'up') {
            args.view?.parent?.nativeViewProtected.requestDisallowInterceptTouchEvent(true);
        }

        const w = Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredWidth());
        const x = clamp(args.getX(), 0, w);

        hsva.h = (x / w) * 360;

        updateHex();
    }

    function drawGrid(args) {
        const canvas: Canvas = args.canvas;
        const w = canvas.getWidth();
        const h = canvas.getHeight();

        const cols = 12;
        const rows = 10;

        const cellW = w / cols;
        const cellH = h / rows;

        let selectedGridIndex = -1;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let rgb;

                // grayscale row
                if (y === 0) {
                    const g = Math.round(255 - (x / (cols - 1)) * 255);

                    rgb = {
                        r: g,
                        g,
                        b: g
                    };
                } else {
                    const hue = (x / cols) * 360;
                    const t = y / (rows - 1);
                    const clampedT = Math.min(t, 0.92);

                    // dark -> full color
                    if (clampedT <= 0.5) {
                        rgb = hsvToRgb(hue, 1, 0.25 + (clampedT / 0.5) * 0.75);
                    }
                    // full color -> white
                    else {
                        const base = hsvToRgb(hue, 1, 1);

                        const k = (clampedT - 0.5) / 0.5;

                        rgb = {
                            r: Math.round(base.r + (255 - base.r) * k),
                            g: Math.round(base.g + (255 - base.g) * k),
                            b: Math.round(base.b + (255 - base.b) * k)
                        };
                    }
                }

                paint.setStyle(Style.FILL);
                paint.setColor(new Color(255, rgb.r, rgb.g, rgb.b));
                canvas.drawRect(new RectF(x * cellW, y * cellH, (x + 1) * cellW, (y + 1) * cellH), paint);
                const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                const isSelected = Math.abs(hsv.h - hsva.h) < 5 && Math.abs(hsv.s - hsva.s) < 0.05 && Math.abs(hsv.v - hsva.v) < 0.05;
                if (isSelected) {
                    selectedGridIndex = y * cols + x;
                }
            }
        }

        if (selectedGridIndex >= 0) {
            const gx = selectedGridIndex % cols;
            const gy = Math.floor(selectedGridIndex / cols);

            strokePaint.setColor(new Color('white'));

            canvas.drawRoundRect(new RectF(gx * cellW, gy * cellH, (gx + 1) * cellW, (gy + 1) * cellH), 4, 4, strokePaint);
        }
    }
    function onGridTouch(args) {
        if (__ANDROID__ && args.action !== 'up') {
            args.view?.parent?.nativeViewProtected.requestDisallowInterceptTouchEvent(true);
        }
        const canvas = args.object as CanvasView;
        const w = Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredWidth());
        const h = Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredHeight());

        const cols = 12;
        const rows = 10;

        const x = clamp(args.getX(), 0, w);
        const y = clamp(args.getY(), 0, h);

        const gx = Math.floor((x / w) * cols);
        const gy = Math.floor((y / h) * rows);

        if (gy === 0) {
            const g = Math.round(255 - (gx / (cols - 1)) * 255);

            const hsv = rgbToHsv(g, g, g);

            hsva.h = hsv.h;
            hsva.s = hsv.s;
            hsva.v = hsv.v;
        } else {
            hsva.h = (gx / cols) * 360;

            const t = gy / (rows - 1);
            const clampedT = Math.min(t, 0.92);

            // dark -> full color
            if (clampedT <= 0.5) {
                hsva.s = 1;

                hsva.v = 0.25 + (clampedT / 0.5) * 0.75;
            }
            // full color -> pastel/white
            else {
                hsva.v = 1;

                hsva.s = 1 - (clampedT - 0.5) / 0.5;
            }
        }

        updateHex();
    }

    /* ----------------------------
        RGB SLIDERS (CLAMP FIXED)
    ---------------------------- */

    function drawRgbSlider(args, channel: 'r' | 'g' | 'b') {
        const canvas: Canvas = args.canvas;

        const width = canvas.getWidth();
        const height = canvas.getHeight();
        const thumbRadius = height / 2 - 4;

        const rgb = currentRgb();

        const start = { ...rgb };
        const end = { ...rgb };

        start[channel] = 0;
        end[channel] = 255;

        const gradient = new LinearGradient(0, 0, width, 0, [new Color(`rgb(${start.r},${start.g},${start.b})`), new Color(`rgb(${end.r},${end.g},${end.b})`)], null, TileMode.CLAMP);

        paint.setShader(gradient);

        canvas.drawRoundRect(new RectF(0, 0, width, height), SLIDER_HEIGHT / 2, SLIDER_HEIGHT / 2, paint);

        const value = rgb[channel];

        const rawX = (value / 255) * width;

        const x = clamp(rawX, thumbRadius + 4, width - thumbRadius - 4);

        paint.setShader(null);

        paint.setStyle(Style.FILL);
        paint.setColor(new Color(hsvaToHex()));

        canvas.drawCircle(x, height / 2, thumbRadius, paint);

        strokePaint.setColor(new Color('white'));

        canvas.drawCircle(x, height / 2, thumbRadius, strokePaint);
    }

    function setRgb(channel, args) {
        if (__ANDROID__ && args.action !== 'up') {
            args.view?.parent?.nativeViewProtected.requestDisallowInterceptTouchEvent(true);
        }
        const canvas = args.object as CanvasView;
        const w = Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredWidth());

        const t = clamp(args.getX(), 0, w) / w;

        const rgb = currentRgb();
        rgb[channel] = Math.round(t * 255);

        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

        hsva.h = hsv.h;
        hsva.s = hsv.s;
        hsva.v = hsv.v;

        updateHex();
    }

    /* ----------------------------
        ALPHA SLIDER
    ---------------------------- */

    function drawAlphaSlider(args) {
        const canvas = args.canvas;
        const width = canvas.getWidth();
        const height = canvas.getHeight();
        const thumbRadius = height / 2 - 4;

        const rgb = currentRgb();

        const gradient = new LinearGradient(0, 0, width, 0, [new Color(`rgba(${rgb.r},${rgb.g},${rgb.b},0)`), new Color(`rgba(${rgb.r},${rgb.g},${rgb.b},1)`)], null, TileMode.CLAMP);

        paint.setShader(gradient);
        canvas.drawRoundRect(new RectF(0, 0, width, height), SLIDER_HEIGHT / 2, SLIDER_HEIGHT / 2, paint);

        const rawX = hsva.a * width;
        const x = clamp(rawX, thumbRadius + 4, width - thumbRadius - 4);

        paint.setShader(null);

        paint.setStyle(Style.FILL);
        paint.setColor(new Color(hsvaToHex()));

        canvas.drawCircle(x, height / 2, thumbRadius, paint);

        strokePaint.setColor(new Color('white'));

        canvas.drawCircle(x, height / 2, thumbRadius, strokePaint);
    }

    function onAlphaTouch(args) {
        if (__ANDROID__ && args.action !== 'up') {
            args.view?.parent?.nativeViewProtected.requestDisallowInterceptTouchEvent(true);
        }
        const canvas = alphaCanvas.nativeView;
        const w = Utils.layout.toDeviceIndependentPixels(canvas.getMeasuredWidth());

        hsva.a = clamp(args.getX() / w, 0, 1);
        updateHex();
    }

    function saveColor() {
        const hex = currentColor.hex;
        if (!saved.includes(hex)) {
            saved.unshift(hex);
            ApplicationSettings.setString('saved', JSON.stringify(saved));
        }
    }

    function selectColor(value: string) {
        try {
            DEV_LOG && console.log('selectColor', value);
            const newColor = new Color(value);
            currentColor = new Color(255, newColor.r, newColor.g, newColor.b);

            updateFromHex();
        } catch (_) {}
    }

    function onSelectedIndexChanged(e) {
        mode = tabs[e.object.selectedIndex].id as any;
    }

    function drawSavedColor(args: { canvas: globalThis.Canvas; object: CanvasView }, color: string): void {
        if (!color) {
            return;
        }
        const canvas = args.canvas;
        const width = canvas.getWidth();
        const height = canvas.getHeight();
        paint.setStyle(Style.FILL);

        if (color === 'add') {
            paint.setColor(colorOutlineVariant);
            canvas.drawCircle(width / 2, height / 2, SAVED_THUMB_RADIUS - 5, paint);
            paint.setColor(colorOnSurfaceVariant);
            paint.setTextAlign(Align.CENTER);
            const fontSize = SAVED_THUMB_RADIUS * 1.4;
            paint.setTextSize(fontSize);
            canvas.drawText('+', width / 2, height / 2 + fontSize / 2.8, paint);
        } else {
            paint.setColor(color);

            if (new Color(color).hex === currentColor.hex) {
                strokePaint.setColor(color);
                canvas.drawCircle(width / 2, height / 2, SAVED_THUMB_RADIUS - 9, paint);
                canvas.drawCircle(width / 2, height / 2, SAVED_THUMB_RADIUS - 5, strokePaint);
            } else {
                canvas.drawCircle(width / 2, height / 2, SAVED_THUMB_RADIUS - 5, paint);
            }
        }
    }

    function onDrawSavedColorTapped(e: TapGestureEventData, color: string): any {
        if (color === 'add') {
            saved.push(currentColor.hex);
            ApplicationSettings.setString(SETTINGS_COLORS_SAVED, JSON.stringify(saved));
            saved = saved;
            colorsPager?.nativeView.refresh();
        } else {
            selectColor(color);
            // For now we only refresh to redraw selected color  on select from saved
            colorsPager?.nativeView.refresh();
        }
    }
</script>

<!-- <page actionBarHidden={true}> -->
<gesturerootview rows="auto,*" {...$$restProps}>
    <!-- <CActionBar title="Color Picker">
        <mdbutton class="actionBarButton" text="mdi-eyedropper-variant" variant="text" on:tap={startScreenPicker} />
    </CActionBar> -->
    <gridlayout padding={16} row={1} rows="auto,*, auto, auto, auto, auto">
        <!-- <gridlayout backgroundColor={hsvaToHex()} borderRadius="18" height="90" /> -->

        <segmentedbar horizontalAlignment="center" marginBottom={16} selectedIndex={tabs.findIndex((t) => t.id === mode)} on:selectedIndexChanged={onSelectedIndexChanged}>
            {#each tabs as tab}
                <segmentedbaritem title={tab.title} variant="outline" />
            {/each}
        </segmentedbar>

        <gridlayout row="1">
            {#if mode === 'grid'}
                <canvasview bind:this={gridCanvas} borderRadius={10} on:draw={drawGrid} on:touch={onGridTouch} />
            {/if}
            {#if mode === 'spectrum'}
                <canvasview bind:this={spectrumCanvas} borderRadius={10} on:draw={drawSpectrum} on:touch={onSpectrumTouch} />
            {/if}
            {#if mode === 'hue'}
                <gridlayout rows="*,auto,auto">
                    <canvasview bind:this={hvSquare} borderRadius={10} on:draw={drawSvSquare} on:touch={onSvSquareTouch} />
                    <label class="header" row={1} text={lu('hue')} />
                    <canvasview bind:this={hueBarCanvas} height={SLIDER_HEIGHT} row={2} on:draw={drawHueBar} on:touch={onHueBarTouch} />
                </gridlayout>
            {/if}
            {#if mode === 'sliders'}
                <stacklayout verticalAlignment="center">
                    <label class="header" text={lu('red')} />
                    <canvasview bind:this={redCanvas} height={SLIDER_HEIGHT} on:draw={(e) => drawRgbSlider(e, 'r')} on:touch={(e) => setRgb('r', e)} />
                    <label class="header" text={lu('green')} />
                    <canvasview bind:this={greenCanvas} height={SLIDER_HEIGHT} on:draw={(e) => drawRgbSlider(e, 'g')} on:touch={(e) => setRgb('g', e)} />
                    <label class="header" text={lu('blue')} />
                    <canvasview bind:this={blueCanvas} height={SLIDER_HEIGHT} on:draw={(e) => drawRgbSlider(e, 'b')} on:touch={(e) => setRgb('b', e)} />
                </stacklayout>
            {/if}
        </gridlayout>

        <stacklayout row={2} visibility={alphaSupport ? 'visible' : 'collapse'}>
            <label class="header" text={lu('opacity')} />
            <canvasview bind:this={alphaCanvas} height={SLIDER_HEIGHT} on:draw={drawAlphaSlider} on:touch={onAlphaTouch} />
        </stacklayout>

        <gridlayout columns="auto,*" marginBottom={10} marginTop={10} row={4} rows="*,auto">
            <gridlayout backgroundColor={hsvaToHex(hsva)} borderRadius={8} height={MAIN_COLOR_SIZE} width={MAIN_COLOR_SIZE} />
            <pager bind:this={colorsPager} col={1} items={pagedSavedColors} marginLeft={10} selectedIndex={0}>
                <Template let:item>
                    <wraplayout height="100%" width="100%">
                        {#each { length: savedPerPage } as _, index}
                            <canvasview
                                height={SAVED_THUMB_RADIUS * 2}
                                visibility={item[index] ? 'visible' : 'collapse'}
                                width={SAVED_THUMB_RADIUS * 2}
                                on:draw={(e) => drawSavedColor(e, item[index])}
                                on:tap={(e) => onDrawSavedColorTapped(e, item[index])} />
                        {/each}
                    </wraplayout>
                </Template>
            </pager>
            <!-- <pagerindicator
                col={1}
                color={colorSurfaceContainerHigh}
                horizontalAlignment="center"
                marginBottom={5}
                pagerViewId="pager"
                row={1}
                selectedColor={colorOnSurfaceVariant}
                type="worm"
                verticalAlignment="bottom" /> -->
        </gridlayout>
        <stacklayout row={5}>
            <gridlayout columns="*,auto">
                <textfield
                    hint={lc('color_hex_hint')}
                    text={currentColor.hex.slice(1, 7)}
                    variant="outline"
                    on:returnPress={(e) => {
                        selectColor('#' + e.object.text);
                    }} />

                <mdbutton col={1} text={lc('select')} verticalAlignment="center" on:tap={(e) => closeBottomSheet(currentColor)} />
            </gridlayout>
        </stacklayout>
    </gridlayout>
</gesturerootview>
<!-- </page> -->
