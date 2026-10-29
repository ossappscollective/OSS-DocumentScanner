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

    // iOS: a glass Cancel pill and a prominent action. Android: a close icon and a text action
    const cancelProps = __IOS__ ? { text: lc('cancel'), variant: 'glass' } : { src: appIcon('close'), variant: 'text' };
    const doneVariant = __IOS__ ? 'contained' : 'text';
</script>

<gridlayout columns="auto,*,auto,auto" padding="12 16 8 16" {...$$restProps}>
    <uibutton accessibilityLabel={lc('cancel')} {...cancelProps} on:tap={onCancel} />
    <label class="sheetHeaderTitle" col={1} color={colorOnSurface} text={title} verticalAlignment="center" />
    <uibutton
        accessibilityLabel={actionLabel}
        col={2}
        marginRight={4}
        variant={__IOS__ ? 'glass' : 'text'}
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
        variant={doneVariant}
        visibility={doneText ? 'visible' : 'collapsed'}
        on:tap={onDone}
    />
</gridlayout>
