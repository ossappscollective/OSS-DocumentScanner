<script lang="ts">
    export let text: string;
    export let defaultPadding = 6;
    export let scale = 1;
</script>

<label
    class="pageIndicator"
    borderRadius={10 * scale}
    height={20 * scale}
    horizontalAlignment="right"
    paddingLeft={defaultPadding * scale}
    paddingRight={defaultPadding * scale}
    {text}
    verticalAlignment="bottom"
    verticalTextAlignment="center"
    on:longPress
    {...$$restProps} />
