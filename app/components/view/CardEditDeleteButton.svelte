<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    $: ({ colorError } = $colors);
</script>

<uibutton
    accessibilityLabel={lc('delete')}
    color={colorError}
    height={44}
    marginTop={__IOS__ ? 18 : 6}
    padding="0"
    variant="text"
    verticalAlignment="top"
    width={44}
    {...$$restProps}
    {...{ src: appIcon('delete') }}
    on:tap
/>
