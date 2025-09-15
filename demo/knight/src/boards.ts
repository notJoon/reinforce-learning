export interface Square {
    x: number;
    y: number;
}

/**
 * Generate N×N square board coordinates: (0..N-1, 0..N-1).
 * Throws on invalid sizes (<=0 or non-integer).
 */
export function generateSquareBoard(size: number): Square[] {
    if (!Number.isInteger(size) || size <= 0) {
        throw new Error(`Invalid board size: ${size}. Expected positive integer.`);
    }
    const cells: Square[] = [];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            cells.push({ x, y });
        }
    }
    return cells;
}

export function render(x: number, y: number): "light" | "dark" {
    return (x + y) % 2 === 0 ? "light" : "dark";
}
