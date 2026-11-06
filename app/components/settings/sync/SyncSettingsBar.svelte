<script lang="ts">
    import { closeModal } from '@shared/utils/svelte/ui';
    import { lc } from '~/helpers/locale';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let title: string;
    export let onSave: () => void;
    let { colorOnBackground } = $colors;
    $: ({ colorOnBackground } = $colors);
    const close = () => closeModal(undefined);
</script>

<appBar color={colorOnBackground} iosIconRenderingMode="alwaysTemplate" scrollBehavior="lift" scrollTargetId="syncSettingsCollectionView" size={__IOS__ ? 'large' : 'small'} {title} ios:translucent={true}>
    {#if __ANDROID__}
        <navigationButton {...{ 'android.systemIcon': 'ic_menu_close_clear_cancel' }} on:tap={close} />
    {:else}
        <appBarItem icon={appIcon('close')} ios.position="left" text={lc('close')} on:tap={close} />
    {/if}
    <appBarItem icon={appIcon('check')} ios.position="right" prominent={true} text={lc('save')} on:tap={onSave} />
</appBar>
