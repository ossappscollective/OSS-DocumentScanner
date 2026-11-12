<script lang="ts">
    import { getSyncDots } from '~/utils/documentCell';

    /** the colors of the sync services of the document */
    export let syncColors: string[] = [];
    export let max = 5;

    $: ({ more, shown } = getSyncDots(syncColors, max));
</script>

<!-- the structure of a cell is fixed: only the visibility and the colors change -->
<uisurface class="cardChip" visibility={shown.length ? 'visible' : 'collapsed'} {...$$restProps}>
    <label padding="0 8" verticalAlignment="center">
        {#each [0, 1, 2, 3, 4, 5] as index (index)}
            <span color={shown[index]} fontSize={12} text={index < shown.length ? (index ? ' ' : '') + '●' : ''} />
        {/each}
        <span fontSize={10} fontWeight="600" text={more ? ' +' + more : ''} />
    </label>
</uisurface>
