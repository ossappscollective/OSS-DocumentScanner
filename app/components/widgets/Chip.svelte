<script lang="ts">
    import { colors, fonts } from '~/variables';

    // technique for only specific properties to get updated on store change
    $: ({ colorOnPrimary, colorOnSurface, colorOutline, colorPrimary, colorSurfaceContainer } = $colors);

    export let text: string;
    export let rightIcon: string = null;
</script>

<gridlayout borderColor={colorOutline} borderRadius={8} borderWidth={1} columns="auto,auto,auto" height={32} margin={4} paddingLeft={rightIcon ? 8 : 12} paddingRight={8} {...$$restProps}>
    <label color={colorOnSurface} fontFamily={$fonts.mdi} fontSize={16} marginRight={4} text={rightIcon} verticalAlignment="middle" visibility={rightIcon ? 'visible' : 'collapse'} />

    <label col={1} fontSize={14} paddingBottom={2} {text} verticalAlignment="middle" />
    <uibutton col={2} color={colorOnSurface} fontFamily={$fonts.mdi} fontSize={16} marginLeft={4} padding={0} text="mdi-close" variant="text" verticalAlignment="middle" width={20} on:tap />
</gridlayout>
