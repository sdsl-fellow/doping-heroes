// 300 K, complete ionization, nondegenerate Si, fixed low-field mobilities.
// Separate n/p samples avoid accidentally teaching that compensation always raises conductivity.
export function sample(kind = 'intrinsic', concentration = 0) {
  const ni = 1e10, q = 1.602176634e-19;
  const majority = (concentration + Math.sqrt(concentration ** 2 + 4 * ni ** 2)) / 2;
  const minority = ni ** 2 / majority;
  const n = kind === 'p' ? minority : majority;
  const p = kind === 'p' ? majority : minority;
  return { n, p, sigma: q * (n * 1350 + p * 480) };
}
export const stages = [sample(), sample('n', 1e14), sample('n', 1e15), sample('p', 1e15)];
export function level(completed) {
  const best = Math.max(...[0, ...completed.map(i => i + 1)].map(i => stages[i]?.sigma ?? stages[0].sigma));
  return 1 + Math.min(5, Math.max(0, Math.floor(Math.log10(best / stages[0].sigma))));
}
