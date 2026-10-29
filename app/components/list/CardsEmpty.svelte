<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let onScan: () => void;
    let { colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimary } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimary } = $colors);
    $: iconColor = __IOS__ ? colorPrimary : colorOnPrimaryContainer;
</script>

<stacklayout horizontalAlignment="center" paddingLeft={36} paddingRight={36} {...$$restProps}>
    <uisurface class="cardsEmptyIcon" android:variant="clear">
        <CardIcon color={iconColor} horizontalAlignment="center" size={40} src={appIcon('wallet')} verticalAlignment="center" />
    </uisurface>
    <label textAlignment="center" textWrap={true}>
        <span fontSize={20} fontWeight="bold" text={lc('no_card_yet_title')} />
        <span color={colorOnSurfaceVariant} fontSize={14} text={'\n' + lc('no_card_yet_help')} />
    </label>
    <uibutton height={44} horizontalAlignment="center" marginTop={18} text={lc('scan_card')} variant="contained" on:tap={onScan} />
</stacklayout>
