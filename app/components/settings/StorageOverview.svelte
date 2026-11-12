<script lang="ts">
    import { filesize } from 'filesize';
    import { isEInk } from '~/helpers/theme';
    import { lc, lcp } from '~/helpers/locale';
    import { getRowCorners } from '~/utils/groupedRows';
    import type { StorageSizes } from '~/utils/originals';
    import { colors, fontScale } from '~/variables';

    export let totals: StorageSizes;
    export let nbDocuments: number;

    $: ({ colorOnSurface, colorOnSurfaceVariant, colorPrimary, colorSurfaceContainerHigh, colorSurfaceContainerLow, colorTertiary } = $colors);

    // the bar is split in thousandths: a star column takes a whole number
    $: imagesPart = totals.total ? Math.round((totals.size / totals.total) * 1000) : 0;
    $: originalsPart = totals.total ? 1000 - imagesPart : 0;
    $: legend = [
        { label: lc('storage_images'), size: totals.size, color: colorPrimary },
        { label: lc('storage_originals'), size: totals.sourceSize, color: colorTertiary }
    ];
</script>

<!-- what the documents use, split between the images and the originals which can be deleted -->
<gridlayout backgroundColor={isEInk ? 'transparent' : colorSurfaceContainerLow} margin="8 16 0 16" padding="16" rows="auto,auto,auto" {...getRowCorners('only', __IOS__)}>
    <label color={colorOnSurface} fontSize={34 * $fontScale} fontWeight="bold" text={filesize(totals.total, { output: 'string' })} />
    <label color={colorOnSurfaceVariant} fontSize={14 * $fontScale} horizontalAlignment="right" text={lcp('documents_count', nbDocuments)} verticalAlignment="bottom" />
    <gridlayout backgroundColor={colorSurfaceContainerHigh} borderRadius={8} height={16} marginBottom={12} marginTop={12} row={1}>
        <gridlayout columns="{imagesPart}*,{originalsPart}*">
            <gridlayout backgroundColor={colorPrimary} borderRadius={8} marginRight={1} visibility={imagesPart ? 'visible' : 'collapsed'} />
            <gridlayout backgroundColor={colorTertiary} borderRadius={8} col={1} marginLeft={1} visibility={originalsPart ? 'visible' : 'collapsed'} />
        </gridlayout>
    </gridlayout>
    <stacklayout row={2}>
        {#each legend as entry (entry.label)}
            <gridlayout columns="auto,*,auto" height={28}>
                <gridlayout backgroundColor={entry.color} borderRadius={5} height={10} marginRight={10} verticalAlignment="center" width={10} />
                <label col={1} color={colorOnSurface} fontSize={15 * $fontScale} text={entry.label} verticalAlignment="center" />
                <label col={2} color={colorOnSurfaceVariant} fontSize={15 * $fontScale} text={filesize(entry.size, { output: 'string' })} verticalAlignment="center" />
            </gridlayout>
        {/each}
    </stacklayout>
</gridlayout>
