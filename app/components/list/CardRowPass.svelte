<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import { Item } from '~/components/list/MainList.svelte';

    export let item: Item;

    $: images = item.doc.pages[0]?.pkpass?.images;
    $: logo = images?.logo2x || images?.logo || images?.icon2x || images?.icon;
</script>

<image decodeWidth={Utils.layout.toDevicePixels(96)} margin="8 10" src={logo} stretch="aspectFit" />
