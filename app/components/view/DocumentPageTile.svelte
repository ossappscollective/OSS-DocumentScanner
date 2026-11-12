<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import CardChip from '~/components/common/CardChip.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import { isEInk } from '~/helpers/theme';
    import type { OCRPage } from '~/models/OCRDocument';
    import { appIcon } from '~/utils/appIcons';
    import { getPaperEdge } from '~/utils/documentCell';
    import { colors } from '~/variables';

    export let page: OCRPage;
    export let documentId: string;
    export let index: number;
    export let selected: boolean;
    export let height: number;
    export let width: number;
    export let radius: number;

    $: ({ colorOutlineVariant } = $colors);
</script>

<!-- a sheet of paper: white holder with the edge of a page (shadow on iOS, outline on Android), the whole page is shown in it (aspect fit): the number and the text mark are over it -->
<gridlayout {height} width="100%" {...$$restProps}>
    <gridlayout
        backgroundColor={isEInk ? null : '#FFFFFF'}
        borderRadius={radius}
        margin={6}
        {...getPaperEdge(__IOS__, isEInk, colorOutlineVariant)}
        scaleX={selected ? 0.95 : 1}
        scaleY={selected ? 0.95 : 1}
        on:tap
        on:longPress>
        <RotableImageView
            id="imageView"
            borderRadius={radius}
            decodeWidth={Utils.layout.toDevicePixels(width)}
            fadeDuration={100}
            item={page}
            sharedTransitionTag="document_{documentId}_{page.id}"
            stretch="aspectFit" />
        <CardChip horizontalAlignment="left" margin={8} text={index + 1 + ''} verticalAlignment="bottom" visibility={selected ? 'collapsed' : 'visible'} />
        <CardChip horizontalAlignment="right" icon={appIcon('ocr')} margin={8} verticalAlignment="top" visibility={page.ocrData ? 'visible' : 'collapsed'} />
        <SelectedIndicator margin={8} {selected} />
    </gridlayout>
</gridlayout>
