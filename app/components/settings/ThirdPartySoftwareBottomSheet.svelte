<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { closeBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import { type RowPosition, updateRowPositions } from '@shared/utils/groupedRows';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { lc } from '~/helpers/locale';
    import { getSettingsRowProps } from '~/utils/settingsRows';
    import { openLink } from '~/utils/ui';
    import { colors, windowInset } from '~/variables';
    // technique for only specific properties to get updated on store change

    const licences = require('~/licenses.json');

    const items: { moduleName: string; moduleUrl: string; position?: RowPosition }[] = [
        {
            moduleName: 'OpenCV 4.12.0',
            moduleUrl: 'https://github.com/opencv/opencv'
        },
        {
            moduleName: 'tesseract 5.5.1',
            moduleUrl: 'https://github.com/tesseract-ocr/tesseract'
        },
        {
            moduleName: 'Leptonica 1.85.0',
            moduleUrl: 'https://github.com/DanBloomberg/leptonica'
        },
        {
            moduleName: 'libjpeg v9f',
            moduleUrl: 'http://libjpeg.sourceforge.net'
        },
        {
            moduleName: 'libpng 1.6.48',
            moduleUrl: 'http://www.libpng.org/pub/png/libpng.html'
        },
        {
            moduleName: 'Material Design Icons',
            moduleUrl: 'https://pictogrammers.com/library/mdi/'
        },
        {
            moduleName: 'NativeScript',
            moduleUrl: 'https://github.com/NativeScript/NativeScript'
        }
    ]
        .concat(
            __ANDROID__ && CARD_APP
                ? [
                      {
                          moduleName: 'ZXing-C++',
                          moduleUrl: 'https://github.com/zxing-cpp/zxing-cpp'
                      }
                  ]
                : []
        )
        .concat(
            __ANDROID__
                ? [
                      {
                          moduleName: 'jsoncons',
                          moduleUrl: 'https://github.com/danielaparker/jsoncons'
                      }
                  ]
                : []
        )
        .concat(licences.dependencies);

    updateRowPositions(
        (index) => items[index],
        items.length,
        (item) => !!item
    );

    // the rows stand out of the surface of the sheet
    $: rowColors = { ...$colors, colorSurfaceContainerLow: $colors.colorSurfaceContainerHigh };

    function onTap(item) {
        if (item.moduleUrl) {
            openLink(item.moduleUrl);
        }
    }
</script>

<gesturerootview padding="0 0 {$windowInset.bottom} 0" rows="auto,auto">
    <SheetHeader onCancel={() => closeBottomSheet()} title={lc('third_parties')} />
    <collectionView id="trackingScrollView" height="300" ios:contentInsetAdjustmentBehavior={2} itemIdGenerator={(item, i) => i} {items} row={1}>
        <Template let:item>
            <ListItemAutoSize
                item={{ title: item.moduleName, subtitle: item.moduleUrl }}
                {...getSettingsRowProps({ ...item, description: item.moduleUrl }, rowColors, __IOS__)}
                on:tap={() => onTap(item)}
            />
        </Template>
    </collectionView>
</gesturerootview>
