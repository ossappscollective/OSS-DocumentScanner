<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let pages: number = 1;
    export let hasCode: boolean = false;
    export let favorite: boolean = false;
    let { colorOnPrimaryContainer, colorOnSurface } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurface } = $colors);
    $: color = __IOS__ ? colorOnSurface : colorOnPrimaryContainer;
    $: hasPages = pages > 1;
    $: visible = hasPages || hasCode || favorite;
</script>

<!-- one pill with a hairline between the segments: its structure is fixed, only the visibility changes -->
<uisurface class="cardChip" android:variant="clear" visibility={visible ? 'visible' : 'collapsed'} {...$$restProps}>
    <stacklayout orientation="horizontal">
        <stacklayout minWidth={22} orientation="horizontal" padding="0 8" visibility={hasPages ? 'visible' : 'collapsed'}>
            <CardIcon {color} horizontalAlignment="center" marginRight={4} size={12} src={appIcon('pages')} verticalAlignment="center" />
            <label {color} fontSize={11} fontWeight="600" lineBreak="end" maxLines={1} text={pages + ''} verticalAlignment="center" />
        </stacklayout>
        <absolutelayout backgroundColor={color} height={12} opacity={0.25} verticalAlignment="center" visibility={hasPages && (hasCode || favorite) ? 'visible' : 'collapsed'} width={1} />
        <stacklayout minWidth={22} orientation="horizontal" visibility={hasCode ? 'visible' : 'collapsed'}>
            <CardIcon {color} horizontalAlignment="center" size={12} src={appIcon('qrcode')} verticalAlignment="center" />
        </stacklayout>
        <absolutelayout backgroundColor={color} height={12} opacity={0.25} verticalAlignment="center" visibility={hasCode && favorite ? 'visible' : 'collapsed'} width={1} />
        <stacklayout minWidth={22} orientation="horizontal" visibility={favorite ? 'visible' : 'collapsed'}>
            <CardIcon {color} horizontalAlignment="center" size={12} src={appIcon('favorite_on')} verticalAlignment="center" />
        </stacklayout>
    </stacklayout>
</uisurface>
