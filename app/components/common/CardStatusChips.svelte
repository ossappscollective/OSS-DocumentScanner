<script lang="ts">
    import dayjs from 'dayjs';
    import CardChip from '~/components/common/CardChip.svelte';
    import CardStatusChip from '~/components/common/CardStatusChip.svelte';
    import type { DocumentExtra } from '~/models/OCRDocument';
    import { lc } from '~/helpers/locale';
    import { getCardStatus } from '~/utils/cardStatus';

    export let extra: DocumentExtra;
    export let tint: string = null;

    // the year is only needed when it is not this one
    const formatShortDate = (timestamp: number) => dayjs(timestamp).format(dayjs(timestamp).isSame(dayjs(), 'year') ? 'MMM D' : 'll');

    $: status = getCardStatus(extra, { expiration: lc('expire_on'), balance: lc('balance') });
    $: expiration = status.find((current) => current.kind !== 'balance');
    $: balance = status.find((current) => current.kind === 'balance');
</script>

<!-- the structure of a cell is fixed: only the visibility and the texts change -->
<stacklayout horizontalAlignment="left" orientation="horizontal" visibility={status.length ? 'visible' : 'collapsed'} {...$$restProps}>
    <CardStatusChip
        horizontalAlignment="left"
        text={expiration?.kind === 'expired' ? lc('expired') : lc('expires_on_date', expiration?.kind === 'expiring' ? formatShortDate(expiration.timestamp) : '')}
        {tint}
        tone={expiration?.kind === 'expired' ? 'alert' : 'warning'}
        verticalAlignment="middle"
        visibility={expiration ? 'visible' : 'collapsed'}
    />
    <CardChip {tint} marginLeft={expiration ? 6 : 0} text={balance?.kind === 'balance' ? balance.value + '' : ''} verticalAlignment="middle" visibility={balance ? 'visible' : 'collapsed'} />
</stacklayout>
