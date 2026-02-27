/**
 * Convert perfect-freehand outline points to SVG path d string.
 * From https://www.npmjs.com/package/perfect-freehand#rendering
 */
const average = (a: number, b: number) => (a + b) / 2;

export function getSvgPathFromStroke(points: number[][], closed = true): string {
  const len = points.length;
  if (len < 2) return "";

  if (len === 2) {
    const [a, b] = points;
    return `M${a[0].toFixed(2)},${a[1].toFixed(2)} L${b[0].toFixed(2)},${b[1].toFixed(2)}`;
  }
  if (len === 3) {
    const [a, b, c] = points;
    return `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${c[0].toFixed(2)},${c[1].toFixed(2)}`;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];
  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
  }

  if (closed) result += "Z";
  return result;
}
