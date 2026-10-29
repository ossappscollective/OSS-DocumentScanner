<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import { Item } from '~/components/list/MainList.svelte';

    export let item: Item;
</script>

<RotableImageView
    id="imageView"
    borderRadius={11}
    decodeWidth={Utils.layout.toDevicePixels(96)}
    document={item.doc}
    fadeDuration={100}
    item={item.doc.pages[0]}
    sharedTransitionTag="document_{item.doc.id}_{item.doc.pages[0].id}"
    stretch="aspectFill"
/>
