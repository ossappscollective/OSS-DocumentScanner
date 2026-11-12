<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let title: string;
    export let doneText: string = undefined;
    export let doneEnabled = true;
    export let onCancel: () => void = undefined;
    export let onDone: () => void = undefined;
    /** an icon action next to the done action (add a field...) */
    export let actionIcon: string = undefined;
    export let actionLabel: string = undefined;
    export let onAction: () => void = undefined;
    /** the action is a text button (reset...) instead of an icon */
    export let actionText: string = undefined;
    export let actionEnabled = true;
    /** a sheet which applies every change at once has no Cancel: iOS keeps the room so that the title stays centered */
    export let showCancel = true;
    let { colorOnPrimary, colorOnSurface, colorPrimary } = $colors;
    $: ({ colorOnPrimary, colorOnSurface, colorPrimary } = $colors);
    $: doneColor = __IOS__ ? colorOnPrimary : colorPrimary;
</script>

<gridlayout columns="auto,*,auto,auto" padding="12 16 8 16" {...$$restProps}>
    <!-- iOS: a glass Cancel pill and a prominent action. Android: a close icon and a text action -->
    <uibutton
        accessibilityLabel={lc('cancel')}
        {...{ 'android:src': appIcon('close') }}
        android:fontSize={28}
        android:variant="text"
        ios:text={lc('cancel')}
        ios:variant="glass"
        visibility={showCancel ? 'visible' : __IOS__ ? 'hidden' : 'collapse'}
        on:tap={onCancel} />
    <label class="sheetHeaderTitle" col={1} color={colorOnSurface} text={title} verticalAlignment="center" />
    <uibutton
        accessibilityLabel={actionLabel}
        col={2}
        android:color={actionText ? colorPrimary : undefined}
        android:fontSize={actionText ? 14 : 28}
        android:height={actionText ? 40 : undefined}
        marginRight={4}
        android:variant="text"
        ios:variant="glass"
        isEnabled={actionEnabled}
        opacity={actionEnabled ? 1 : 0.45}
        text={actionText}
        visibility={actionIcon || actionText ? 'visible' : 'collapsed'}
        {...{ src: actionIcon }}
        on:tap={onAction}
    />
    <uibutton
        col={3}
        color={doneColor}
        isEnabled={doneEnabled}
        opacity={doneEnabled ? 1 : 0.45}
        text={doneText}
        android:fontSize={16}
        android:minWidth={72}
        android:variant="text"
        ios:variant="contained"
        visibility={doneText ? 'visible' : 'collapsed'}
        on:tap={onDone}
    />
</gridlayout>
