export function calculateLevel(exp: number) {
    let level = 1;

    while (exp >= 100 * Math.pow(level, 1.5)) {
        level++;
    }

    return level;
}
