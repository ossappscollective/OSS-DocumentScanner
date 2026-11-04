<script lang="ts">
    import CardChip from '~/components/common/CardChip.svelte';
    import CardStatusChip from '~/components/common/CardStatusChip.svelte';
    import type { DocumentExtra } from '~/models/OCRDocument';
    import { lc } from '~/helpers/locale';
    import { type CardStatus, formatShortDate, getCardStatus } from '~/utils/cardStatus';

    export let extra: DocumentExtra = undefined;
    /** the status of a card which does not keep it in its extra (a pass) */
    export let status: CardStatus[] = undefined;
    export let tint: string = null;
    /** the color of the card under a tinted chip */
    export let background: string = null;

    $: statuses = status ?? getCardStatus(extra, { expiration: lc('expire_on'), balance: lc('balance') });
    $: expiration = statuses.find((current) => current.kind === 'expired' || current.kind === 'expiring');
    $: values = statuses.flatMap((current) => (current.kind === 'balance' ? [current.value + ''] : current.kind === 'info' ? [current.text] : []));
</script>

<!-- the structure of a cell is fixed: only the visibility and the texts change -->
<stacklayout horizontalAlignment="left" orientation="horizontal" visibility={statuses.length ? 'visible' : 'collapsed'} {...$$restProps}>
    <CardStatusChip
        horizontalAlignment="left"
        text={expiration?.kind === 'expired' ? lc('expired') : lc('expires_on_date', expiration?.kind === 'expiring' ? formatShortDate(expiration.timestamp) : '')}
        {background}
        {tint}
        tone={expiration?.kind === 'expired' ? 'alert' : 'warning'}
        verticalAlignment="middle"
        visibility={expiration ? 'visible' : 'collapsed'}
    />
    {#each [0, 1, 2] as index (index)}
        <CardChip {background} {tint} marginLeft={expiration || index > 0 ? 6 : 0} text={values[index] ?? ''} verticalAlignment="middle" visibility={values[index] ? 'visible' : 'collapsed'} />
    {/each}
</stacklayout>
