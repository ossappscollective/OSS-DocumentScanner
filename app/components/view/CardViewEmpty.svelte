<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let onAddCode: () => void;
    export let onAddPhoto: () => void;
    export let onAddDetail: () => void;
    let { colorOnBackground, colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimary } = $colors;
    $: ({ colorOnBackground, colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimary } = $colors);
    $: iconColor = __IOS__ ? colorPrimary : colorOnPrimaryContainer;
</script>

<!-- a card with no code, photo or detail: propose to add one -->
<stacklayout horizontalAlignment="center" paddingLeft={24} paddingRight={24} {...$$restProps}>
    <uisurface class="cardsEmptyIcon" android:variant="clear">
        <CardIcon color={iconColor} horizontalAlignment="center" size={40} src={appIcon('wallet')} verticalAlignment="center" />
    </uisurface>
    <label textAlignment="center" textWrap={true}>
        <span color={colorOnBackground} fontSize={20} fontWeight="bold" text={lc('card_empty_title')} />
        <span color={colorOnSurfaceVariant} fontSize={14} text={'\n' + lc('card_empty_help')} />
    </label>
    <uibutton height={44} horizontalAlignment="center" marginTop={16} text={lc('add_code')} variant="outline" width={220} {...{ src: appIcon('qrcode') }} on:tap={onAddCode} />
    <uibutton height={44} horizontalAlignment="center" marginTop={8} text={lc('add_photo')} variant="outline" width={220} {...{ src: appIcon('image') }} on:tap={onAddPhoto} />
    <uibutton height={44} horizontalAlignment="center" marginTop={8} text={lc('add_detail')} variant="outline" width={220} {...{ src: appIcon('add') }} on:tap={onAddDetail} />
</stacklayout>
