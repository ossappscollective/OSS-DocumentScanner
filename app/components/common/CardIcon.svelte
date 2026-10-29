<script lang="ts">
    export let src: string;
    export let color: string;
    export let size = 14;
</script>

<nsimage height={size} {src} stretch="aspectFit" tintColor={color} width={size} {...$$restProps} />
