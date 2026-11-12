/** A switch in a row does not toggle on a tap of the row: the row does it for it, unless the switch reports its own change first */
export function createSwitchRowTap() {
    let timer: ReturnType<typeof setTimeout> = null;
    function cancel() {
        clearTimeout(timer);
        timer = null;
    }
    return {
        onRowTap(toggle: () => void) {
            cancel();
            timer = setTimeout(toggle, 10);
        },
        cancel
    };
}
