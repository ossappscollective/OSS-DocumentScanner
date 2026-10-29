<script context="module" lang="ts">
    import { Color } from '@nativescript/core';
    import { prompt } from '@nativescript-community/ui-dialogs';
    import { showError } from '@shared/utils/showError';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { lc } from '~/helpers/locale';
    import { DocFolder } from '~/models/OCRDocument';
    import { appIcon } from '~/utils/appIcons';
    import { getRowCorners, getRowPosition } from '~/utils/groupedRows';
    import { colors, windowInset } from '~/variables';

    const SEARCH_MIN_FOLDERS = 8;
    const ROW_HEIGHT = 52;
    const ROW_GAP = __IOS__ ? 0 : 2;
    const MAX_VISIBLE_ROWS = 8;
    const ICON_SIZE = 32;

    interface Row {
        id: string;
        // the name given back when the row is tapped: '' removes the documents from their folder
        name: string;
        title: string;
        icon: string;
        color?: string;
        checked?: boolean;
    }
</script>

<script lang="ts">
    let { colorOnSurface, colorPrimary, colorOutlineVariant, colorSurfaceContainerHigh } = $colors;
    $: ({ colorOnSurface, colorPrimary, colorOutlineVariant, colorSurfaceContainerHigh } = $colors);

    /** every folder the documents can go to */
    export let folders: DocFolder[];
    /** the folder the documents are in now, undefined at the root */
    export let currentFolder: DocFolder = undefined;

    let rootView;
    let filter = '';

    $: showSearch = folders.length > SEARCH_MIN_FOLDERS;
    $: lowerFilter = filter.trim().toLowerCase();
    $: rows = [
        ...(currentFolder ? [{ id: 'root', name: '', title: lc('remove_from_folder'), icon: appIcon('close') }] : []),
        ...folders
            .filter((folder) => !lowerFilter || folder.name.toLowerCase().includes(lowerFilter))
            .map((folder) => ({ id: 'folder_' + folder.id, name: folder.name, title: folder.name, icon: appIcon('folder_outline'), color: folder.color, checked: folder.id === currentFolder?.id })),
        { id: 'new', name: undefined, title: lc('new_folder'), icon: appIcon('new_folder') }
    ] as Row[];
    $: listHeight = Math.min(rows.length, MAX_VISIBLE_ROWS) * (ROW_HEIGHT + ROW_GAP);

    function close(name?: string) {
        rootView.nativeView.bindingContext.closeCallback(name);
    }

    async function onRowTap(row: Row) {
        try {
            if (row.id !== 'new') {
                close(row.name);
                return;
            }
            const result = await prompt({
                title: lc('new_folder'),
                hintText: lc('name'),
                okButtonText: lc('create'),
                cancelButtonText: lc('cancel'),
                autoFocus: true
            });
            const name = result?.text?.trim();
            if (result?.result && name?.length) {
                close(name);
            }
        } catch (error) {
            showError(error);
        }
    }
</script>

<gesturerootview bind:this={rootView} rows="auto,auto,auto">
    <SheetHeader onCancel={() => close()} title={lc('move_folder')} />
    <textfield
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('search')}
        margin="0 16 8 16"
        returnKeyType="search"
        row={1}
        text={filter}
        variant="outline"
        visibility={showSearch ? 'visible' : 'collapsed'}
        on:textChange={(e) => (filter = e['value'])}
    />
    <scrollview height={listHeight} marginBottom={$windowInset.bottom + 16} row={2}>
        <stacklayout>
            {#each rows as row, index (row.id)}
                {@const position = getRowPosition(index === 0, index === rows.length - 1)}
                {@const iconColor = row.color || colorPrimary}
                <gridlayout
                    backgroundColor={colorSurfaceContainerHigh}
                    {...getRowCorners(position, __IOS__)}
                    columns="auto,*,auto"
                    height={ROW_HEIGHT}
                    margin="{__IOS__ ? 0 : 1} 16"
                    padding="0 14"
                    rippleColor={colorOnSurface}
                    on:tap={() => onRowTap(row)}
                >
                    <gridlayout
                        backgroundColor={Color.mix(new Color(colorSurfaceContainerHigh), new Color(iconColor), 16).hex}
                        borderRadius={ICON_SIZE / 2}
                        height={ICON_SIZE}
                        verticalAlignment="center"
                        width={ICON_SIZE}
                    >
                        <CardIcon color={iconColor} horizontalAlignment="center" size={20} src={row.icon} verticalAlignment="center" />
                    </gridlayout>
                    <label col={1} color={colorOnSurface} fontSize={16} fontWeight="500" lineBreak="end" marginLeft={10} maxLines={1} text={row.title} verticalAlignment="center" />
                    <CardIcon col={2} color={colorPrimary} size={16} src={appIcon('check')} verticalAlignment="center" visibility={row.checked ? 'visible' : 'collapsed'} />
                    <gridlayout
                        backgroundColor={colorOutlineVariant}
                        colSpan={3}
                        height={0.5}
                        marginLeft={46}
                        marginRight={-14}
                        verticalAlignment="bottom"
                        visibility={__IOS__ && index < rows.length - 1 ? 'visible' : 'collapsed'}
                    />
                </gridlayout>
            {/each}
        </stacklayout>
    </scrollview>
</gesturerootview>
