<script lang="ts">
    import { Img } from '@nativescript-community/ui-image';
    import { ImageSource } from '@nativescript/core';
    import { onDestroy } from 'svelte';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { OCRDocument, OCRPage } from '~/models/OCRDocument';
    import { IMAGE_CONTEXT_OPTIONS, IMAGE_DECODE_HEIGHT } from '~/utils/constants';
    import { recycleImages } from '~/utils/images';
    import { getPageColorMatrix } from '~/utils/matrix';
    import { showError } from '@shared/utils/showError';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';

    const dispatch = createEventDispatcher();
    export let zoomable = false;
    export let item: OCRPage & { image?: ImageSource } = null;
    export let src: string = null;
    export let stretch: any = 'aspectFit';
    export let imageFunctionArg = null;

    let SVImageView: NativeViewElementNode<Img>;
    // $: item && rotateToRotation(item.newRotation);
    export async function rotateToRotation(newRotation, animated = false) {
        if (!item || newRotation === undefined) {
            return;
        }
        try {
            const imageView = SVImageView?.nativeElement;
            if (newRotation === item.rotation || !imageView) {
                return;
            }
            if (__ANDROID__ && animated) {
                await imageView.animate({
                    duration: 200,
                    imageRotation: newRotation
                } as any);
            }
            imageView['imageRotation'] = item.rotation = newRotation % 360;
            dispatch('rotated', { newRotation });
        } catch (err) {
            showError(err);
        }
    }
    let imageToDestroy;
    function getImageSrc(item) {
        if (imageToDestroy) {
            const toRelease = imageToDestroy;
            setTimeout(() => {
                recycleImages(toRelease);
            }, 100);
            imageToDestroy = null;
        }
        if (item?.image) {
            if (typeof item.image === 'function') {
                // TODO: it is a promise!
                let result = item.image(imageFunctionArg);
                if (result instanceof Promise) {
                    result = result.then((r) => {
                        imageToDestroy = r;
                        return r;
                    });
                } else {
                    imageToDestroy = result;
                }
                return result;
            }
            return item.image;
        }
        return item?.imagePath;
    }

    onDestroy(() => {
        if (imageToDestroy) {
            recycleImages(imageToDestroy);
            imageToDestroy = null;
        }
    });
</script>

{#if zoomable}
    <zoomimage
        bind:this={SVImageView}
        colorMatrix={getPageColorMatrix(item)}
        decodeWidth={IMAGE_DECODE_HEIGHT}
        ios:contextOptions={IMAGE_CONTEXT_OPTIONS}
        imageRotation={item?.rotation ?? 0}
        maxZoom={10}
        src={src || getImageSrc(item)}
        {stretch}
        {...$$restProps}
        on:rotateAnimated={(e) => rotateToRotation(e.rotation, true)} />
{:else}
    <image
        bind:this={SVImageView}
        colorMatrix={getPageColorMatrix(item)}
        decodeWidth={IMAGE_DECODE_HEIGHT}
        fadeDuration={100}
        ios:contextOptions={IMAGE_CONTEXT_OPTIONS}
        imageRotation={item?.rotation ?? 0}
        src={src || getImageSrc(item)}
        {stretch}
        {...$$restProps}
        on:rotateAnimated={(e) => rotateToRotation(e.rotation, true)} />
{/if}
