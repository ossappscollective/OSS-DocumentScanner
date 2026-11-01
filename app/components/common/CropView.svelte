<script context="module" lang="ts">
    import { Canvas, CanvasView, Cap, Direction, FillType, Join, Matrix, Paint, Path, Style } from '@nativescript-community/ui-canvas';
    import { ApplicationSettings, Color, ImageSource, TouchGestureEventData, Utils } from '@nativescript/core';
    import { debounce } from '@nativescript/core/utils';
    import { QRCodeData, QuadPoint, Quads } from 'plugin-nativeprocessor';
    import { onDestroy } from 'svelte';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Easing, Tween, animateTween, createTween, easeSlide, stopTween } from '~/utils/animations/tween';
    import { getCardAccent } from '~/utils/cardColors';
    import { IMAGE_DECODE_HEIGHT, MAGNIFIER_SENSITIVITY, SETTINGS_MAGNIFIER_SENSITIVITY } from '~/utils/constants';
    import { hapticTick, isReduceMotion } from '~/utils/haptics';
    import { loadImage, recycleImages } from '~/utils/images';
    import { showError } from '@shared/utils/showError';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import { colors } from '~/variables';
    import RotableImageView from './RotableImageView.svelte';
    import { colorTheme, isEInk } from '~/helpers/theme';
    const padding = 16;
    const HOLDER_MARGIN = 12;
    const HOLDER_RADIUS = 28;
    // the radius of the magnifier
    const ZOOOM_GLASS_SIZE = 50;
    const GLASS_INSET = 8;
    // a touch which starts in this corner of the holder moves the magnifier to the other side
    const GLASS_CORNER_ZONE = 180;
    const GRABBED_SCALE = 1.25;
    const CORNER_RADIUS = 10;
    const CORNER_RING = 2;
    const EDGE_THICKNESS = 6;
    const EDGE_MAX_LENGTH = 48;
    const HALO_RADIUS = 22;
    const HOLDER_COLOR = '#26262A';
    const WHITE = '#FFFFFF';
    // in pixels: it is used as a decode size, both for `loadImage` and for the image view
    const ZOOM_IMAGE_MAX_SIZE = IMAGE_DECODE_HEIGHT;

    declare namespace svelteNative.JSX {
        interface ViewAttributes {
            'on:redo'?: (args) => void;
            'on:undo'?: (args) => void;
        }
    }
</script>

<script lang="ts">
    const dispatch = createEventDispatcher();
    let { colorPrimary, colorSecondary } = $colors;
    // technique for only specific properties to get updated on store change
    $: ({ colorPrimary, colorSecondary } = $colors);

    // the editor is dark in every theme: the accent is lightened until it reads on a dark page
    let accent: string;
    $: accent = isEInk ? '#000000' : getCardAccent(colorPrimary, true, colorPrimary).accent;
    const animationsEnabled = !isEInk && !isReduceMotion();

    function invalidate() {
        canvasView?.nativeView?.invalidate();
    }
    function animate(tween: Tween, to: number, duration: number, ease?: Easing) {
        animateTween(tween, to, animationsEnabled ? duration : 0, ease);
    }
    // 0 to 1: how much the grabbed handles are grabbed, and how visible the magnifier is
    const grabTween = createTween(0, invalidate);
    // the x of the center of the magnifier
    const glassTween = createTween(0, invalidate);
    // 0 to 1: the quad on its way to a new quad (the full image)
    const quadTween = createTween(0, updateQuadTween, endQuadTween);
    let glassPlaced = false;
    let touchStartedInGlassZone = false;
    let grabbedQuadIndex = -1;
    let grabbedCorners: number[] = [];

    let canvasView: NativeViewElementNode<CanvasView>;
    let prevTouchPoint;
    let drawingRatio: number;
    const shaderMatrix: Matrix = new Matrix();
    const currentImageMatrix: Matrix = new Matrix();
    const currentCropMatrix: Matrix = new Matrix();
    const inversedCurrentMatrix: Matrix = new Matrix();
    let closestQuadIndex = -1;
    let closestCornerQuadIndex: number[] = [];
    const cornersPaint = new Paint();
    cornersPaint.color = colorPrimary;
    cornersPaint.setStrokeWidth(14);
    cornersPaint.style = Style.STROKE;
    cornersPaint.setStrokeJoin(Join.ROUND);
    cornersPaint.setStrokeCap(Cap.ROUND);
    const fillPaint = new Paint();
    fillPaint.style = Style.FILL;
    const zoomImagePaint = new Paint();
    const glassPath = new Path();

    export let imagePath: string = null;
    export let imageWidth: number = null;
    export let imageHeight: number = null;
    export let imageRotation: number = null;
    export let quads: Quads;
    export let quadChanged = false;
    export let qrcode: QRCodeData = null;
    export let undos = [];
    export let redos = [];

    let actualWidth = imageWidth;
    let actualHeight = imageHeight;
    let needRotation = false;
    $: {
        const theRotation = rotation || imageRotation || 0;
        needRotation = theRotation && theRotation % 180 !== 0;
        if (needRotation) {
            actualWidth = imageHeight;
            actualHeight = imageWidth;
        } else {
            actualWidth = imageWidth;
            actualHeight = imageHeight;
        }
    }

    let currentQuads = quads;
    $: currentQuads = quads;

    const rotation = 0;
    let zoomImage: ImageSource;
    let zoomImagePath: string;
    let zoomImageScale: number = 1;
    let mappedQuads;
    $: updateMatrix(canvasView, imagePath, actualWidth, actualHeight);

    $: if (quads && canvasView) {
        updateMatrix(canvasView, imagePath, actualWidth, actualHeight);
        quadChanged = true;
        canvasView.nativeView.invalidate();
    }

    function distance(point1: QuadPoint, point2: QuadPoint) {
        return Math.hypot(point2[0] - point1[0], point2[1] - point1[1]);
    }

    function isConvex(arr: QuadPoint[]) {
        const { length } = arr;
        let pre = 0,
            curr = 0;
        for (let i = 0; i < length; ++i) {
            const dx1 = arr[(i + 1) % length][0] - arr[i][0];
            const dx2 = arr[(i + 2) % length][0] - arr[(i + 1) % length][0];
            const dy1 = arr[(i + 1) % length][1] - arr[i][1];
            const dy2 = arr[(i + 2) % length][1] - arr[(i + 1) % length][1];
            curr = dx1 * dy2 - dx2 * dy1;
            if (curr !== 0) {
                if ((curr > 0 && pre < 0) || (curr < 0 && pre > 0)) {
                    return false;
                } else {
                    pre = curr;
                }
            }
        }
        return true;
    }
    function getQuadAndCornerClosestToPoint(point1: QuadPoint) {
        let centerDist = Number.MAX_SAFE_INTEGER;
        let centerDistIndex = -1;

        let minHandleIndex = -1;
        let minHandleDist = Number.MAX_SAFE_INTEGER;
        let minHandleCorners: number[] = [];

        let minIndex = -1;
        let minDist = Number.MAX_SAFE_INTEGER;
        let minCorner = 0;
        for (let index = 0; index < quads.length; index++) {
            const quad = mappedQuads[index];
            const length = quad.length;
            let minX, maxX, minY, maxY;
            for (let j = 0; j < length; j++) {
                const point = quad[j];
                const nextPoint = quad[(j + 1) % length];
                minX = point[0] < minX || minX == null ? point[0] : minX;
                maxX = point[0] > maxX || maxX == null ? point[0] : maxX;
                minY = point[1] < minY || minY == null ? point[1] : minY;
                maxY = point[1] > maxY || maxY == null ? point[1] : maxY;
                const handleCenter = [(nextPoint[0] + point[0]) / 2, (nextPoint[1] + point[1]) / 2] as QuadPoint;
                const hdist = distance(point1, handleCenter);
                if (hdist < minHandleDist) {
                    minHandleCorners = [j, (j + 1) % length];
                    minHandleDist = hdist;
                    minHandleIndex = index;
                }
                const dist = distance(point1, point);
                if (dist < minDist) {
                    minCorner = j;
                    minDist = dist;
                    minIndex = index;
                }
                // currentPoint = point;
            }
            const quadCenterDist = distance([(minX + maxX) / 2, (minY + maxY) / 2], point1);
            if (quadCenterDist < centerDist) {
                centerDistIndex = index;
                centerDist = quadCenterDist;
            }
        }
        // DEV_LOG && console.log('getQuadAndCornerClosestToPoint', minIndex, minHandleIndex, centerDistIndex, centerDist, minHandleDist, minDist);
        if (minIndex !== -1 || minHandleIndex !== -1 || centerDistIndex !== -1) {
            const dists = [centerDist, minHandleDist, minDist];
            const minVal = Math.min(...dists);
            switch (dists.indexOf(minVal)) {
                case 0:
                    return [centerDistIndex, [0, 1, 2, 3]] as [number, number[]];
                case 1:
                    return [minHandleIndex, minHandleCorners] as [number, number[]];
                case 2:
                    return [minIndex, [minCorner]] as [number, number[]];
            }
            // if (minHandleDist < minDist) {
            //     return [minHandleIndex, minHandleCorners] as [number, number[]];
            // } else  if (minHandleDist < minDist) {
            //     return [minHandleIndex, minHandleCorners] as [number, number[]];
            // } else {
            //     return [minIndex, [minCorner]] as [number, number[]];
            // }
        }
        return [-1, []] as [number, number[]];
    }
    const sensitivityFactor = ApplicationSettings.getNumber(SETTINGS_MAGNIFIER_SENSITIVITY, MAGNIFIER_SENSITIVITY);
    let changeOnTouch = false;
    let lastUndo;
    function onTouch(event: TouchGestureEventData) {
        if (quadTween.duration && quadTween.value !== quadTween.to) {
            return;
        }
        try {
            const x = event.getX();
            const y = event.getY();
            switch (event.action) {
                case 'down': {
                    lastUndo = {
                        quads: JSON.stringify(currentQuads),
                        mappedQuads: JSON.stringify(mappedQuads)
                    };
                    changeOnTouch = false;
                    prevTouchPoint = [x, y];
                    touchStartedInGlassZone = x <= GLASS_CORNER_ZONE && y <= GLASS_CORNER_ZONE;
                    [closestQuadIndex, closestCornerQuadIndex] = getQuadAndCornerClosestToPoint(prevTouchPoint);
                    if (closestQuadIndex !== -1) {
                        grabbedQuadIndex = closestQuadIndex;
                        grabbedCorners = closestCornerQuadIndex;
                        glassPlaced = false;
                        animate(grabTween, 1, 100);
                        dispatch('dragging', { detail: true });
                        hapticTick();
                    }
                    // if (result) {
                    //     closestQuadIndex = [result[0]];
                    //     closestCornerQuadIndex = [result[1]];
                    // } else {
                    //     closestQuadIndex = [];
                    //     closestCornerQuadIndex = [];
                    // }
                    break;
                }
                case 'up':
                case 'cancel': {
                    closestQuadIndex = -1;
                    closestCornerQuadIndex = [];
                    animate(grabTween, 0, 100);
                    dispatch('dragging', { detail: false });
                    // the handles followed the finger past the image: back on the crop which was really applied
                    mapQuads();
                    if (changeOnTouch) {
                        redos.splice(0, redos.length);
                        undos.push(lastUndo);
                        dispatch('undosChanged');
                    } else {
                        lastUndo = null;
                    }
                    break;
                }
                case 'move': {
                    if (closestQuadIndex !== -1) {
                        const canUpdate = true;
                        const updates = [];
                        for (let index = 0; index < closestCornerQuadIndex.length; index++) {
                            const cornerQuadIndex = closestCornerQuadIndex[index];
                            const quad = mappedQuads[closestQuadIndex];
                            const touchMoveXDistance = (x - prevTouchPoint[0]) * sensitivityFactor;
                            const touchMoveYDistance = (y - prevTouchPoint[1]) * sensitivityFactor;

                            const newX = quad[cornerQuadIndex][0] + touchMoveXDistance;
                            const newY = quad[cornerQuadIndex][1] + touchMoveYDistance;
                            const cornerNewPosition = getMatrixMappedPoint(inversedCurrentMatrix, [newX, newY]);
                            // console.log('cornerNewPosition', x, y, quad[closestCornerQuadIndex], newX, newY, cornerNewPosition);
                            // make sure the user doesn't drag the corner outside the image preview container
                            // if (cornerNewPosition[0] >= 0 && cornerNewPosition[0] < actualWidth && cornerNewPosition[1] >= 0 && cornerNewPosition[1] < actualHeight) {
                            cornerNewPosition[0] = Math.max(0, Math.min(actualWidth, cornerNewPosition[0]));
                            cornerNewPosition[1] = Math.max(0, Math.min(actualHeight, cornerNewPosition[1]));
                            updates.push({
                                cornerIndex: cornerQuadIndex,
                                mappedPoint: [newX, newY],
                                point: cornerNewPosition.map(Math.round)
                            });
                            // } else {
                            //     canUpdate = false;
                            // }
                        }
                        if (canUpdate) {
                            const quad = [...mappedQuads[closestQuadIndex]];
                            const currentQuad = [...currentQuads[closestQuadIndex]];
                            updates.forEach((u) => {
                                quad[u.cornerIndex] = u.mappedPoint;
                                currentQuad[u.cornerIndex] = u.point;
                            });
                            if (isConvex(quad)) {
                                quadChanged = true;
                                changeOnTouch = true;
                                for (let index = 0; index < quad.length; index++) {
                                    currentQuads[closestQuadIndex][index] = currentQuad[index];
                                }
                                mappedQuads[closestQuadIndex] = quad;
                            }
                        }
                        prevTouchPoint = [x, y];
                    } else {
                        return;
                    }
                    break;
                }
            }
            canvasView.nativeView.invalidate();
        } catch (error) {
            console.error(error, error.stack);
        }
    }
    function updateUndoRedo(lastData) {
        mappedQuads = JSON.parse(lastData.mappedQuads);
        const quads = JSON.parse(lastData.quads);
        for (let index = 0; index < quads.length; index++) {
            const quad = quads[index];
            if (currentQuads[index]) {
                for (let j = 0; j < quad.length; j++) {
                    currentQuads[index][j] = quad[j];
                }
            }
        }
        quadChanged = undos.length > 0;
        canvasView.nativeView.invalidate();
    }
    export function applyUndo() {
        try {
            if (undos.length) {
                const lastUndo = undos.pop();
                redos.push({
                    quads: JSON.stringify(currentQuads),
                    mappedQuads: JSON.stringify(mappedQuads)
                });
                updateUndoRedo(lastUndo);
                dispatch('undosChanged');
            }
        } catch (error) {
            showError(error);
        }
    }

    export function applyRedo() {
        try {
            if (redos.length) {
                const lastRedo = redos.pop();
                undos.push({
                    quads: JSON.stringify(currentQuads),
                    mappedQuads: JSON.stringify(mappedQuads)
                });
                updateUndoRedo(lastRedo);
                dispatch('undosChanged');
            }
        } catch (error) {
            showError(error);
        }
    }

    let quadFrom: QuadPoint[] = [];
    let quadTo: QuadPoint[] = [];
    function updateQuadTween() {
        quadTo.forEach((point, index) => {
            currentQuads[0][index] = [0, 1].map((axis) => Math.round(quadFrom[index][axis] + (point[axis] - quadFrom[index][axis]) * quadTween.value)) as QuadPoint;
        });
        mapQuads();
        invalidate();
    }
    function endQuadTween() {
        quadChanged = true;
        dispatch('undosChanged');
    }
    // moves the first quad to `quad` in one undo step
    export function applyQuad(quad: QuadPoint[]) {
        const current = currentQuads?.[0];
        if (!current || quad.every((point, index) => point[0] === current[index][0] && point[1] === current[index][1])) {
            return;
        }
        undos.push({ quads: JSON.stringify(currentQuads), mappedQuads: JSON.stringify(mappedQuads) });
        redos.splice(0, redos.length);
        quadFrom = current.map((point) => [...point] as QuadPoint);
        quadTo = quad;
        quadTween.value = 0;
        animate(quadTween, 1, 250);
    }

    function getMatrixMappedPoint(matrix: Matrix, p) {
        if (__ANDROID__) {
            const nArray = Array.create('float', 2);
            nArray[0] = p[0];
            nArray[1] = p[1];
            matrix.mapPoints(nArray);
            return [nArray[0], nArray[1]];
        } else {
            const dst = [];
            matrix.mapPoints(dst, p);
            return dst;
        }
    }

    // function getRotation() {
    //     return rotation || imageRotation || 0;
    // }
    function clearImages() {
        if (zoomImage) {
            recycleImages(zoomImage);
            zoomImage = null;
        }
    }
    onDestroy(() => {
        [grabTween, glassTween, quadTween].forEach(stopTween);
        clearImages();
    });
    function mapQuads() {
        mappedQuads = quads.map((quad) => quad.map((p) => getMatrixMappedPoint(currentCropMatrix, p)));
    }
    const updateMatrix = debounce(async function updateMatrix(canvas = canvasView, image = imagePath, width = actualWidth, height = actualHeight) {
        try {
            const nCanvas = canvas?.nativeView;
            if (!nCanvas || !image) {
                return;
            }

            if (!zoomImage || zoomImagePath !== image) {
                clearImages();
                zoomImagePath = image;
                zoomImage = await loadImage(imagePath, { sourceWidth: width, sourceHeight: height, resizeThreshold: ZOOM_IMAGE_MAX_SIZE });
                if (zoomImage?.android || zoomImage?.ios) {
                    zoomImageScale = width / zoomImage.width;
                }
            }
            const w = Utils.layout.toDeviceIndependentPixels(nCanvas.getMeasuredWidth()) - 2 * padding;
            const h = Utils.layout.toDeviceIndependentPixels(nCanvas.getMeasuredHeight()) - 2 * padding;
            if (w <= 0 || h <= 0) {
                return;
            }
            const canvasRatio = w / h;
            // let imageWidth = width;
            // let imageHeight = height;
            // // const needRotation = false ;
            // if (needRotation) {
            //     imageWidth = height;
            //     imageHeight = width;
            // }
            const imageRatio = width / height;
            let cx = padding;
            let cy = padding;
            if (imageRatio < canvasRatio) {
                drawingRatio = h / height;
                cx += (w - h * imageRatio) / 2;
            } else {
                drawingRatio = w / width;
                cy += (h - w / imageRatio) / 2;
            }
            // DEV_LOG && console.log('updateMatrix', w, h, cx, cy, width, height, imageRatio, canvasRatio);
            currentImageMatrix.reset();
            currentCropMatrix.reset();
            // if (needRotation) {
            //     currentImageMatrix.postTranslate(-image.width / 2, -image.height / 2);
            //     currentImageMatrix.postRotate(rotation);
            //     currentImageMatrix.postTranslate(image.height / 2, image.width / 2);
            // }
            // console.log('updateMatrix', imageWidth, imageHeight, editingImage.rotationAngle, needRotation, editingImage.rotationAngle % 180, imageRatio, canvasRatio, drawingRatio, cx, cy,  quads)
            currentImageMatrix.postScale(drawingRatio, drawingRatio);
            currentCropMatrix.postScale(drawingRatio, drawingRatio);
            currentImageMatrix.postTranslate(cx, cy);
            currentCropMatrix.postTranslate(cx, cy);
            // inversedCurrentMatrix = new Matrix();
            currentCropMatrix.invert(inversedCurrentMatrix);
            mapQuads();
            nCanvas.invalidate();
        } catch (error) {
            console.error(error, error.stack);
        }
    }, 1);
    // device coordinates: `point` is the corner in image coordinates, `mappedPoint` where it is drawn
    function drawZoomGlass(canvas: Canvas, point: QuadPoint, mappedPoint: QuadPoint, visibility: number) {
        const centerY = GLASS_INSET + ZOOOM_GLASS_SIZE;
        const leftX = centerY;
        const rightX = canvas.getWidth() - leftX;
        let targetX = leftX;
        if (touchStartedInGlassZone) {
            targetX = distance(mappedPoint, [rightX, centerY]) <= ZOOOM_GLASS_SIZE ? leftX : rightX;
        } else if (distance(mappedPoint, [leftX, centerY]) <= ZOOOM_GLASS_SIZE) {
            targetX = rightX;
        }
        if (!glassPlaced) {
            glassPlaced = true;
            glassTween.value = glassTween.to = targetX;
        } else if (targetX !== glassTween.to) {
            animate(glassTween, targetX, 150, easeSlide);
        }
        const centerX = glassTween.value;
        const zoom = 2 * drawingRatio;
        const imageLeft = centerX - point[0] * zoom;
        const imageTop = centerY - point[1] * zoom;
        shaderMatrix.reset();
        shaderMatrix.postScale(zoomImageScale * zoom, zoomImageScale * zoom, 0, 0);
        shaderMatrix.postTranslate(imageLeft, imageTop);

        const scale = animationsEnabled ? 0.9 + 0.1 * visibility : 1;
        canvas.save();
        canvas.scale(scale, scale, centerX, centerY);
        glassPath.reset();
        glassPath.addCircle(centerX, centerY, ZOOOM_GLASS_SIZE, Direction.CW);
        canvas.clipPath(glassPath);
        // outside of the image is the holder: the image is neither repeated nor stretched there
        fillPaint.color = isEInk ? WHITE : HOLDER_COLOR;
        fillPaint.setAlpha(Math.round(255 * visibility));
        canvas.drawCircle(centerX, centerY, ZOOOM_GLASS_SIZE, fillPaint);
        if (zoomImage) {
            canvas.save();
            canvas.clipRect(imageLeft, imageTop, imageLeft + actualWidth * zoom, imageTop + actualHeight * zoom);
            zoomImagePaint.setAlpha(Math.round(255 * visibility));
            canvas.drawBitmap(zoomImage, shaderMatrix, zoomImagePaint);
            canvas.restore();
        }
        cornersPaint.color = accent;
        cornersPaint.strokeWidth = 2;
        cornersPaint.setAlpha(Math.round(255 * visibility));
        canvas.drawCircle(centerX, centerY, ZOOOM_GLASS_SIZE - 1, cornersPaint);
        cornersPaint.color = '#FFFFFFE6';
        cornersPaint.strokeWidth = 1;
        cornersPaint.setAlpha(Math.round(230 * visibility));
        canvas.drawLine(centerX - 12, centerY, centerX + 12, centerY, cornersPaint);
        canvas.drawLine(centerX, centerY - 12, centerX, centerY + 12, cornersPaint);
        canvas.restore();
    }

    const path: Path = new Path();
    const dimPath: Path = new Path();
    function addQuadToPath(target: Path, points: QuadPoint[], reverse = false) {
        (reverse ? [...points].reverse() : points).forEach((point, index) => (index ? target.lineTo(point[0], point[1]) : target.moveTo(point[0], point[1])));
        target.close();
    }
    // the holder outside of the outline is dimmed: an even-odd path. The quad runs against the holder: iOS fills a UIBezierPath with the winding rule whatever the fill type
    function drawDim(canvas: Canvas) {
        dimPath.reset();
        dimPath.setFillType(FillType.EVEN_ODD);
        dimPath.addRoundRect(0, 0, canvas.getWidth(), canvas.getHeight(), HOLDER_RADIUS, HOLDER_RADIUS, Direction.CW);
        mappedQuads.forEach((quad) => {
            const area = quad.reduce((sum, point, index) => sum + point[0] * quad[(index + 1) % quad.length][1] - quad[(index + 1) % quad.length][0] * point[1], 0);
            addQuadToPath(dimPath, quad, area > 0);
        });
        fillPaint.color = isEInk ? '#FFFFFF99' : '#0000008C';
        canvas.drawPath(dimPath, fillPaint);
    }
    function drawQuad(canvas: Canvas, corners: QuadPoint[], quadIndex: number) {
        const unit = 1 / drawingRatio;
        const grab = grabbedQuadIndex === quadIndex ? grabTween.value : 0;
        const length = corners.length;
        if (grab > 0 && grabbedCorners.length === length) {
            path.reset();
            addQuadToPath(path, corners);
            fillPaint.color = accent;
            fillPaint.setAlpha(Math.round(31 * grab));
            canvas.drawPath(path, fillPaint);
        }
        path.reset();
        addQuadToPath(path, corners);
        cornersPaint.color = accent;
        cornersPaint.strokeWidth = (isEInk ? 3 : 2) * unit;
        canvas.drawPath(path, cornersPaint);

        for (let index = 0; index < length; index++) {
            const start = corners[index];
            const end = corners[(index + 1) % length];
            const edgeLength = distance(start, end);
            if (!edgeLength) {
                continue;
            }
            const grabbedEdge = grab > 0 && grabbedCorners.length === 2 && grabbedCorners[0] === index;
            const thickness = (EDGE_THICKNESS + (grabbedEdge ? 2 * grab : 0)) * unit;
            // the round caps add half the thickness at both ends
            const half = Math.max(0, Math.min(0.3 * edgeLength, EDGE_MAX_LENGTH * unit) - thickness) / 2;
            const middleX = (start[0] + end[0]) / 2;
            const middleY = (start[1] + end[1]) / 2;
            const directionX = ((end[0] - start[0]) / edgeLength) * half;
            const directionY = ((end[1] - start[1]) / edgeLength) * half;
            cornersPaint.color = WHITE;
            cornersPaint.strokeWidth = thickness + 2 * unit;
            canvas.drawLine(middleX - directionX, middleY - directionY, middleX + directionX, middleY + directionY, cornersPaint);
            cornersPaint.color = accent;
            cornersPaint.strokeWidth = thickness;
            canvas.drawLine(middleX - directionX, middleY - directionY, middleX + directionX, middleY + directionY, cornersPaint);
        }

        for (let index = 0; index < length; index++) {
            const point = corners[index];
            const grabbed = grab > 0 && grabbedCorners.includes(index);
            const scale = grabbed ? 1 + (GRABBED_SCALE - 1) * grab : 1;
            if (grabbed && grabbedCorners.length === 1) {
                fillPaint.color = accent;
                fillPaint.setAlpha(Math.round(71 * grab));
                canvas.drawCircle(point[0], point[1], HALO_RADIUS * unit, fillPaint);
            }
            fillPaint.color = WHITE;
            canvas.drawCircle(point[0], point[1], (CORNER_RADIUS + CORNER_RING) * scale * unit, fillPaint);
            fillPaint.color = accent;
            canvas.drawCircle(point[0], point[1], CORNER_RADIUS * scale * unit, fillPaint);
        }
    }
    function onCanvasDraw({ canvas }: { canvas: Canvas }) {
        if (!drawingRatio || !mappedQuads) {
            return;
        }
        drawDim(canvas);
        canvas.save();
        canvas.concat(currentImageMatrix);
        quads?.forEach((corners, index) => drawQuad(canvas, corners, index));
        if (qrcode?.length) {
            cornersPaint.color = colorSecondary;
            cornersPaint.strokeWidth = 4 / drawingRatio;
            for (let index = 0; index < qrcode.length; index++) {
                const corners = qrcode[index].position;
                let currentCornerPoint = corners[0];
                for (let index = 1; index < corners.length; index++) {
                    const point = corners[index];
                    canvas.drawLine(currentCornerPoint[0], currentCornerPoint[1], point[0], point[1], cornersPaint);
                    currentCornerPoint = point;
                }
                canvas.drawLine(currentCornerPoint[0], currentCornerPoint[1], corners[0][0], corners[0][1], cornersPaint);
            }
        }
        canvas.restore();
        if (grabbedCorners.length === 1 && grabTween.value > 0 && mappedQuads[grabbedQuadIndex]) {
            drawZoomGlass(canvas, quads[grabbedQuadIndex][grabbedCorners[0]], mappedQuads[grabbedQuadIndex][grabbedCorners[0]], grabTween.value);
        }
    }
</script>

<gridlayout
    backgroundColor={isEInk ? WHITE : HOLDER_COLOR}
    borderColor={isEInk ? '#000000' : null}
    borderRadius={HOLDER_RADIUS}
    borderWidth={isEInk ? 1 : 0}
    margin="0 {HOLDER_MARGIN}"
    {...$$restProps}
    id="cropView"
    on:redo={applyRedo}
    on:undo={applyUndo}>
    <RotableImageView decodeWidth={ZOOM_IMAGE_MAX_SIZE} margin={padding} src={imagePath} stretch="aspectFit" zoomable={true} />
    <canvasView bind:this={canvasView} on:draw={onCanvasDraw} on:layoutChanged={() => updateMatrix()} on:touch={onTouch} />
</gridlayout>
