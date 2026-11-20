<script lang="ts">
    import { PKPass, PKPassField } from '~/models/PKPass';
    import { lang } from '~/helpers/locale';
    import { getFieldTextAlignment } from '~/utils/pkpass';
    import { fontScale } from '~/variables';

    const FIELD_LINE_HEIGHT = 16;
    const stars = (count: number) => Array(count).fill('*').join(',');

    export let pkpass: PKPass;
    export let fields: PKPassField[];
    export let labelColor: string;
    export let foregroundColor: string;

    function renderFieldLabel(field: PKPassField) {
        return pkpass.getLocalizedFieldLabel(field, lang).toUpperCase() + '\n';
    }
</script>

<!-- the header fields of a pass: at the top of the pass, right aligned -->
<gridlayout columns={stars(fields.length)} {...$$restProps}>
    {#each fields as field, index}
        <label col={index} paddingLeft={index !== 0 ? 10 : 0} selectable={true} textAlignment={getFieldTextAlignment(field, 'right')}>
            <cspan
                color={labelColor}
                fontSize={13 * $fontScale}
                fontWeight="500"
                lineHeight={FIELD_LINE_HEIGHT}
                text={renderFieldLabel(field)}
                verticalTextAlignment="top"
                visibility={field.label ? 'visible' : 'hidden'} />
            <cspan color={foregroundColor} fontSize={17 * $fontScale} fontWeight="500" text={pkpass.formatFieldValue(field, lang)} />
        </label>
    {/each}
</gridlayout>
