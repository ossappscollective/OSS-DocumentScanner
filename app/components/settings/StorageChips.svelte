<script lang="ts">
    import { filesize } from 'filesize';
    import CardChip from '~/components/common/CardChip.svelte';
    import { appIcon } from '~/utils/appIcons';
    import type { StorageSizes } from '~/utils/originals';

    export let sizes: StorageSizes;
    /** something is before the chips on their line */
    export let hasLeading = false;
</script>

<!-- the structure of a cell is fixed: only the visibility and the texts change -->
<stacklayout marginLeft={hasLeading ? 8 : 0} orientation="horizontal" verticalAlignment="center" visibility={sizes.total ? 'visible' : 'collapsed'}>
    <CardChip fontWeight="700" text={filesize(sizes.total, { output: 'string' })} verticalAlignment="middle" />
    <CardChip icon={appIcon('image')} marginLeft={6} text={filesize(sizes.sourceSize, { output: 'string' })} verticalAlignment="middle" visibility={sizes.sourceSize ? 'visible' : 'collapsed'} />
</stacklayout>
