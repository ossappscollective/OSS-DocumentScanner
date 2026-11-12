<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import { colors } from '~/variables';

    export let onScan: () => void;
    export let title: string = lc('no_card_yet_title');
    export let help: string = lc('no_card_yet_help');
    export let actionText: string = lc('scan_card');
    $: ({ colorOnSurfaceVariant } = $colors);
</script>

<stacklayout horizontalAlignment="center" paddingLeft={36} paddingRight={36} {...$$restProps}>
    <!-- the icon of the app: the launcher icon, as the splash screen shows it -->
    <nsimage height={96} horizontalAlignment="center" marginBottom={18} src={__IOS__ ? 'res://logo' : 'res://splash_icon'} stretch="aspectFit" width={96} />
    <label textAlignment="center" textWrap={true}>
        <span fontSize={20} fontWeight="bold" text={title} />
        <span color={colorOnSurfaceVariant} fontSize={14} text={'\n' + help} />
    </label>
    <uibutton android:paddingLeft={24} android:paddingRight={24} height={44} horizontalAlignment="center" marginTop={18} text={actionText} variant="contained" on:tap={onScan} />
</stacklayout>
