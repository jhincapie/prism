
/**
 * Generates a random number from a standard normal distribution
 * using the Box-Muller transform.
 * @returns {number} A random number from N(0, 1).
 */
export const randomNorm = (): number => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};
