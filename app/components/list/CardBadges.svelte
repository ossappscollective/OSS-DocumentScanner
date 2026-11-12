<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { appIcon } from '~/utils/appIcons';

    export let color: string;
    export let favorite: boolean;
    export let code: boolean;
    export let opacity = 1;
</script>

<stacklayout orientation="horizontal" {...$$restProps}>
    <CardIcon {color} marginRight={code ? 6 : 0} {opacity} size={18} src={appIcon('favorite_on')} visibility={favorite ? 'visible' : 'collapsed'} />
    <CardIcon {color} {opacity} size={18} src={appIcon('qrcode')} visibility={code ? 'visible' : 'collapsed'} />
</stacklayout>
