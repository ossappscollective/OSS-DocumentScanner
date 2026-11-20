<script context="module" lang="ts">
    import { Canvas, CanvasView, Paint } from '@nativescript-community/ui-canvas';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    const paint = new Paint();
</script>

<script lang="ts">
    export let visible: boolean = false;
    export let size = 6;
    export let syncColors: string[] = [];
    let canvas: NativeViewElementNode<CanvasView>;
    // technique for only specific properties to get updated on store change
    $: requestDraw(syncColors);
    function requestDraw(...args) {
        canvas?.nativeElement.redraw();
    }
    function onDraw({ canvas }: { canvas: Canvas }) {
        let deltaX = 20;
        syncColors.forEach((color) => {
            paint.color = color;
            canvas.drawRoundRect(deltaX, size / 2, deltaX + 24, size, size / 2, size / 2, paint);
            deltaX += 30;
        });
    }
</script>

<canvasview bind:this={canvas} id="SyncIndicator" height={size} verticalAlignment="bottom" visibility={visible ? 'visible' : 'hidden'} width="100%" {...$$restProps} on:draw={onDraw} />
