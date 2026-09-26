export function editDistanceAtMostTwo(left: string, right: string): number | undefined {
  const a = Array.from(left);
  const b = Array.from(right);
  if (Math.abs(a.length - b.length) > 2) return undefined;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= b.length; column += 1) {
      const value = Math.min(
        (current[column - 1] ?? 0) + 1,
        (previous[column] ?? 0) + 1,
        (previous[column - 1] ?? 0) + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > 2) return undefined;
    previous = current;
  }
  const result = previous[b.length];
  return result !== undefined && result <= 2 ? result : undefined;
}
