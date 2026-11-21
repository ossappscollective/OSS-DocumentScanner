<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import CardChip from '~/components/common/CardChip.svelte';
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
    stretch="aspectFill" />
<!-- the number of photos: a chip over the corner of the thumbnail -->
<CardChip horizontalAlignment="right" margin={4} text={item.doc.pages.length + ''} verticalAlignment="bottom" visibility={item.doc.pages.length > 1 ? 'visible' : 'collapsed'} />
