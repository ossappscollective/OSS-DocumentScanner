<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import { View } from '@nativescript/core';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { appIcon } from '~/utils/appIcons';
    import type { CardAccent } from '~/utils/cardColors';
    import { colors } from '~/variables';

    export let accent: CardAccent;
    export let onAddCode: (anchor: View) => void;
    export let onAddPhoto: (anchor: View) => void;
    export let onAddDetail: () => void;
    let { colorOnBackground, colorOnSurfaceVariant } = $colors;
    $: ({ colorOnBackground, colorOnSurfaceVariant } = $colors);
</script>

<!-- a card with no code, photo or detail: one primary action, a tonal one and a text one, in the colors of the card -->
<stacklayout horizontalAlignment="center" paddingLeft={24} paddingRight={24} {...$$restProps}>
    <uisurface class="cardsEmptyIcon" android:variant="clear" backgroundColor={accent.container}>
        <CardIcon color={accent.accent} horizontalAlignment="center" size={40} src={appIcon('wallet')} verticalAlignment="center" />
    </uisurface>
    <label textAlignment="center" textWrap={true}>
        <span color={colorOnBackground} fontSize={20} fontWeight="bold" text={lc('card_empty_title')} />
        <span color={colorOnSurfaceVariant} fontSize={14} text={'\n' + lc('card_empty_help')} />
    </label>
    <uibutton
        height={44}
        backgroundColor={accent.accent}
        color={accent.onAccent}
        horizontalAlignment="center"
        marginTop={20}
        text={lc('add_code')}
        variant="contained"
        on:tap={(event) => event.object instanceof View && onAddCode(event.object)}
    />
    <uibutton
        backgroundColor={__IOS__ ? accent.accent + '33' : accent.container}
        color={accent.accent}
        horizontalAlignment="center"
        marginTop={8}
        text={lc('add_photo')}
        variant="flat"
        on:tap={(event) => event.object instanceof View && onAddPhoto(event.object)}
    />
    <uibutton height={44} color={accent.accent} horizontalAlignment="center" marginTop={4} text={lc('add_detail')} variant="text" on:tap={onAddDetail} />
</stacklayout>
