export function defaultEncoder<T>(x: T): string {
    return typeof x === "string" ? x : JSON.stringify(x);
}
