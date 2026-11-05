<script lang="ts">
    /** inline: the content of a persistent sheet, which lives in a page: the page is already the gesture root, a second one would take its handlers */
    export let inline = false;
</script>

{#if inline}
    <gridlayout {...$$restProps}><slot /></gridlayout>
{:else}
    <gesturerootview {...$$restProps} on:closedBottomSheet><slot /></gesturerootview>
{/if}
