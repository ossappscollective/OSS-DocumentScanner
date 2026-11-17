// the icons turn the opposite way of the device (clockwise degrees) to stay upright.
// The result is cumulative so an animation never spins back through the long way
export function nextIconRotation(current: number, deviceDegrees: number) {
    const delta = ((((-deviceDegrees - current) % 360) + 540) % 360) - 180;
    return current + (delta === -180 ? 180 : delta);
}

// android Surface.ROTATION_*: the display turns the opposite way of the device
export function toSurfaceRotation(deviceDegrees: number) {
    return ((((360 - deviceDegrees) % 360) + 360) % 360) / 90;
}
