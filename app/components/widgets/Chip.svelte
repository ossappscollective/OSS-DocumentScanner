<script lang="ts">
    import { colors, fonts } from '~/variables';

    // technique for only specific properties to get updated on store change
    $: ({ colorOnSurface, colorOutline } = $colors);

    export let text: string;
    export let rightIcon: string = null;
</script>

<gridlayout borderColor={colorOutline} borderRadius={16} borderWidth={1} columns="auto,auto" height={32} margin={4} paddingLeft={rightIcon ? 8 : 12} paddingRight={8} {...$$restProps}>
    <label paddingBottom={2} verticalAlignment="middle">
        <span color={colorOnSurface} fontFamily={$fonts.mdi} fontSize={16} text={rightIcon ?? ''} />
        <span fontSize={14} text={rightIcon ? ' ' + text : text} />
    </label>
    <uibutton col={1} color={colorOnSurface} fontFamily={$fonts.mdi} fontSize={16} marginLeft={4} padding={0} text="mdi-close" variant="text" verticalAlignment="middle" width={20} on:tap />
</gridlayout>
