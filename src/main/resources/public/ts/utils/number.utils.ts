export function toLocaleString(value: number) {
    return typeof value === 'number' ? value.toLocaleString() : "";
}