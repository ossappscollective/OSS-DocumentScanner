<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let title: string;
    export let doneText: string = undefined;
    export let doneEnabled = true;
    export let onCancel: () => void;
    export let onDone: () => void = undefined;
    /** an icon action next to the done action (add a field...) */
    export let actionIcon: string = undefined;
    export let actionLabel: string = undefined;
    export let onAction: () => void = undefined;
    let { colorOnPrimary, colorOnSurface, colorPrimary } = $colors;
    $: ({ colorOnPrimary, colorOnSurface, colorPrimary } = $colors);
    $: doneColor = __IOS__ ? colorOnPrimary : colorPrimary;
</script>

<gridlayout columns="auto,*,auto,auto" padding="12 16 8 16" {...$$restProps}>
    <!-- iOS: a glass Cancel pill and a prominent action. Android: a close icon and a text action -->
    <uibutton accessibilityLabel={lc('cancel')} {...{ 'android:src': appIcon('close') }} android:fontSize={28} android:variant="text" ios:text={lc('cancel')} ios:variant="glass" on:tap={onCancel} />
    <label class="sheetHeaderTitle" col={1} color={colorOnSurface} text={title} verticalAlignment="center" />
    <uibutton
        accessibilityLabel={actionLabel}
        col={2}
        android:fontSize={28}
        marginRight={4}
        android:variant="text"
        ios:variant="glass"
        visibility={actionIcon ? 'visible' : 'collapsed'}
        {...{ src: actionIcon }}
        on:tap={onAction}
    />
    <uibutton
        col={3}
        color={doneColor}
        isEnabled={doneEnabled}
        opacity={doneEnabled ? 1 : 0.45}
        text={doneText}
        android:variant="text"
        ios:variant="contained"
        visibility={doneText ? 'visible' : 'collapsed'}
        on:tap={onDone}
    />
</gridlayout>
