<script lang="ts">
    import { fontScale } from '~/variables';

    const FIELD_LINE_HEIGHT = 16;

    /** the label of the field, already rendered: none without a label */
    export let label: string = null;
    export let value: string;
    export let labelColor: string;
    export let valueColor: string;
    export let labelSize: number;
    export let valueSize: number;
    export let valueWeight: string = undefined;
</script>

<label selectable={true} {...$$restProps}>
    {#if label}
        <cspan color={labelColor} fontSize={labelSize * $fontScale} fontWeight="500" lineHeight={FIELD_LINE_HEIGHT} text={label} />
    {/if}
    <cspan color={valueColor} fontSize={valueSize * $fontScale} fontWeight={valueWeight} text={value} />
</label>
