<script lang="ts">
    import { colors, fonts } from '~/variables';
    export let selected: boolean = false;
    // technique for only specific properties to get updated on store change
    $: ({ colorBackground, colorOnPrimary, colorPrimary } = $colors);
</script>

<label
    backgroundColor={colorPrimary}
    borderColor={__IOS__ ? '#ffffff' : colorBackground}
    borderRadius={13}
    borderWidth={2}
    color={colorOnPrimary}
    fontFamily={$fonts.mdi}
    fontSize={14}
    height={26}
    horizontalAlignment="left"
    margin={5}
    text="mdi-check"
    textAlignment="center"
    verticalAlignment="top"
    verticalTextAlignment="center"
    visibility={selected ? 'visible' : 'hidden'}
    width={26}
    {...$$restProps}
/>
