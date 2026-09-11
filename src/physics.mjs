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
// Fixed sample geometry: A = 1 cm², L = 10 µm = 0.001 cm.
// G = sigma A/L, measured in siemens (1/ohm).
export const conductance = s => s.sigma * 1000;
export function growth(completed) {
  return Math.max(...[0,...completed.map(i=>i+1)].map(i=>conductance(stages[i]??stages[0])));
}
export function formatS(value) { return `${Number(value.toPrecision(3))} S`; }
