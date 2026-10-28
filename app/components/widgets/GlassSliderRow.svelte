<script lang="ts">
    export let title: string;
    export let min: number;
    export let max: number;
    export let defaultValue: number;
    export let value: number;
    export let onChange: (value: number) => void;
    export let textColor: string;
    export let secondaryColor: string;
    export let accentColor: string;

    function setValue(newValue: number) {
        value = newValue;
        onChange(newValue);
    }
</script>

<gridlayout columns="*,auto" padding="10 16" rows="auto,auto">
    <label color={textColor} fontSize={17} text={title} verticalAlignment="center" />
    <label col={1} color={value === defaultValue ? secondaryColor : accentColor} fontSize={17} text={(value / 100).toFixed(2)} verticalAlignment="center" on:tap={() => setValue(defaultValue)} />
    <slider colSpan={2} maxValue={max} minValue={min} row={1} stepSize={1} {value} on:valueChange={(event) => setValue(event.value)} />
</gridlayout>
