<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let onScan: () => void;
    let { colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimary, colorPrimaryContainer } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimary, colorPrimaryContainer } = $colors);
</script>

<stacklayout horizontalAlignment="center" paddingLeft={36} paddingRight={36} {...$$restProps}>
    {#if __IOS__}
        <uisurface borderRadius={42} height={84} horizontalAlignment="center" marginBottom={18} width={84}>
            <CardIcon color={colorPrimary} horizontalAlignment="center" size={40} src={appIcon('wallet')} verticalAlignment="center" />
        </uisurface>
    {:else}
        <gridlayout backgroundColor={colorPrimaryContainer} borderRadius={30} height={84} horizontalAlignment="center" marginBottom={18} width={84}>
            <CardIcon color={colorOnPrimaryContainer} horizontalAlignment="center" size={40} src={appIcon('wallet')} verticalAlignment="center" />
        </gridlayout>
    {/if}
    <label fontSize={20} fontWeight="bold" text={lc('no_card_yet_title')} textAlignment="center" />
    <label color={colorOnSurfaceVariant} fontSize={14} marginTop={6} text={lc('no_card_yet_help')} textAlignment="center" textWrap={true} />
    <uibutton height={44} horizontalAlignment="center" marginTop={18} text={lc('scan_card')} variant={__IOS__ ? 'prominentGlass' : 'contained'} on:tap={onScan} />
</stacklayout>
