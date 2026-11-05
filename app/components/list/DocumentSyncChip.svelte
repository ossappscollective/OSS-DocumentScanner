<script lang="ts">
    import { getSyncDots } from '~/utils/documentCell';

    /** the colors of the sync services of the document */
    export let syncColors: string[] = [];
    export let max = 5;

    $: ({ more, shown } = getSyncDots(syncColors, max));
</script>

<!-- the structure of a cell is fixed: only the visibility and the colors change -->
<uisurface class="cardChip" visibility={shown.length ? 'visible' : 'collapsed'} {...$$restProps}>
    <stacklayout orientation="horizontal" padding="0 8" verticalAlignment="center">
        {#each [0, 1, 2, 3, 4, 5] as index (index)}
            <gridlayout
                backgroundColor={shown[index] ?? 'transparent'}
                borderRadius={4.5}
                height={9}
                marginLeft={index ? 4 : 0}
                verticalAlignment="center"
                visibility={index < shown.length ? 'visible' : 'collapsed'}
                width={9} />
        {/each}
        <label fontSize={10} fontWeight="600" marginLeft={4} text={'+' + more} verticalAlignment="center" visibility={more ? 'visible' : 'collapsed'} />
    </stacklayout>
</uisurface>
