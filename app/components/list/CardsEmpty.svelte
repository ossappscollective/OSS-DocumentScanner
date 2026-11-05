<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let onScan: () => void;
    export let icon: string = appIcon('wallet');
    export let title: string = lc('no_card_yet_title');
    export let help: string = lc('no_card_yet_help');
    export let actionText: string = lc('scan_card');
    let { colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimary } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimary } = $colors);
    $: iconColor = __IOS__ ? colorPrimary : colorOnPrimaryContainer;
</script>

<stacklayout horizontalAlignment="center" paddingLeft={36} paddingRight={36} {...$$restProps}>
    <uisurface class="cardsEmptyIcon" android:variant="clear">
        <CardIcon color={iconColor} horizontalAlignment="center" size={40} src={icon} verticalAlignment="center" />
    </uisurface>
    <label textAlignment="center" textWrap={true}>
        <span fontSize={20} fontWeight="bold" text={title} />
        <span color={colorOnSurfaceVariant} fontSize={14} text={'\n' + help} />
    </label>
    <uibutton android:paddingLeft={24} android:paddingRight={24} height={44} horizontalAlignment="center" marginTop={18} text={actionText} variant="contained" on:tap={onScan} />
</stacklayout>
