<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import dayjs from 'dayjs';
    import CardChip from '~/components/common/CardChip.svelte';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import DocumentSyncChip from '~/components/list/DocumentSyncChip.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { isEInk } from '~/helpers/theme';
    import { appIcon } from '~/utils/appIcons';
    import { getInfoPill, getPaperEdge, isAutoName } from '~/utils/documentCell';
    import { colors } from '~/variables';

    export let item: Item;
    export let height: number;
    export let width: number;
    export let radius: number;
    export let syncEnabled: boolean;
    export let syncColors: string[];

    let { colorOnPrimaryContainer, colorOnSurface, colorOutlineVariant, colorSurfaceContainerHigh } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurface, colorOutlineVariant, colorSurfaceContainerHigh } = $colors);

    $: color = __IOS__ ? colorOnSurface : colorOnPrimaryContainer;
    $: page = item.doc.pages[0];
    $: autoName = isAutoName(item.doc.name);
    $: label = autoName ? dayjs(item.doc.createdDate).format('ll') : item.doc.name;
    $: pill = getInfoPill(item.doc.pages.length, item.doc.favorite === 1);
</script>

<!-- the document is the whole tile, with the edge of a page: the chips are over it, never beside it -->
<gridlayout {height} width="100%" {...$$restProps}>
    <gridlayout
        backgroundColor={isEInk ? null : (page?.colors?.[1] ?? colorSurfaceContainerHigh)}
        borderRadius={radius}
        margin={6}
        {...getPaperEdge(__IOS__, isEInk, colorOutlineVariant)}
        scaleX={item.selected ? 0.95 : 1}
        scaleY={item.selected ? 0.95 : 1}
        on:tap
        on:longPress>
        <RotableImageView
            id="imageView"
            borderRadius={radius}
            decodeWidth={Utils.layout.toDevicePixels(width)}
            document={item.doc}
            fadeDuration={100}
            item={page}
            sharedTransitionTag="document_{item.doc.id}_{page?.id}"
            stretch="aspectFill" />
        <CardChip fontWeight={autoName ? '500' : '600'} horizontalAlignment="left" margin={8} marginRight={8} text={label} verticalAlignment="bottom" />
        <stacklayout horizontalAlignment="right" margin={8} verticalAlignment="top">
            <uisurface class="cardChip" horizontalAlignment="right" visibility={pill.visible ? 'visible' : 'collapsed'}>
                <stacklayout orientation="horizontal">
                    <stacklayout orientation="horizontal" padding="0 8" verticalAlignment="center" visibility={pill.pages ? 'visible' : 'collapsed'}>
                        <CardIcon {color} marginRight={4} size={12} src={appIcon('pages')} verticalAlignment="center" />
                        <label {color} fontSize={11} fontWeight="600" text={item.doc.pages.length + ''} verticalAlignment="center" />
                    </stacklayout>
                    <gridlayout backgroundColor={color} height={14} opacity={0.3} verticalAlignment="center" visibility={pill.divider ? 'visible' : 'collapsed'} width={0.5} />
                    <CardIcon {color} margin="0 5" size={12} src={appIcon('favorite_on')} verticalAlignment="center" visibility={pill.favorite ? 'visible' : 'collapsed'} />
                </stacklayout>
            </uisurface>
            <DocumentSyncChip horizontalAlignment="right" marginTop={6} {syncColors} visibility={syncEnabled ? 'visible' : 'collapsed'} />
        </stacklayout>
        <SelectedIndicator margin={8} selected={item.selected} />
    </gridlayout>
</gridlayout>
