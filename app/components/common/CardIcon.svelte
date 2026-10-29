<script lang="ts">
    export let src: string;
    export let color: string;
    export let size = 14;
</script>

<!-- iOS draws the symbol as an image, a button clips the wide ones -->
{#if __IOS__}
    <nsimage height={size} {src} stretch="aspectFit" tintColor={color} width={size} {...$$restProps} />
{:else}
    <uibutton {color} fontSize={size} height={size + 4} isUserInteractionEnabled={false} padding={0} variant="text" {...{ src }} width={size + 4} {...$$restProps} />
{/if}
