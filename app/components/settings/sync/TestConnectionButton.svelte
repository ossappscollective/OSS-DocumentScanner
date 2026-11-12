<script lang="ts">
    import { lc } from '~/helpers/locale';
    import { colors } from '~/variables';

    $: ({ colorError, colorOnError, colorSecondary } = $colors);

    export let testing: boolean;
    /** 0 while not tested, 1 once it succeeded, -1 once it failed */
    export let success: number;
</script>

<gridlayout columns="auto" horizontalAlignment="right" margin="8 16 8 16" rows="auto" verticalAlignment="middle">
    <uibutton
        backgroundColor={success < 0 ? colorError : success > 0 ? 'lightgreen' : colorSecondary}
        color={colorOnError}
        text={success < 0 ? lc('failed') : success > 0 ? lc('successful') : lc('test')}
        verticalAlignment="middle"
        visibility={testing ? 'hidden' : 'visible'}
        on:tap
    />
    <activityindicator busy={testing} height={20} horizontalAlignment="center" verticalAlignment="middle" visibility={testing ? 'visible' : 'hidden'} />
</gridlayout>
