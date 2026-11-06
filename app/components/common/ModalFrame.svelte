<script lang="ts">
    export let page: any;
</script>

<frame id="modal-frame">
    <svelte:component this={page} {...$$restProps} />
</frame>
