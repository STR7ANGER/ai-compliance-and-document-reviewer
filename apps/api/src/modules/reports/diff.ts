export type DiffPart = { kind: "equal" | "added" | "removed"; text: string };

export function diffLines(before: string, after: string): DiffPart[] {
  const left = before.split(/\r?\n/);
  const right = after.split(/\r?\n/);
  const table = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );
  for (let i = left.length - 1; i >= 0; i--)
    for (let j = right.length - 1; j >= 0; j--)
      if (table[i])
        table[i][j] =
          left[i] === right[j]
            ? 1 + (table[i + 1]?.[j + 1] ?? 0)
            : Math.max(table[i + 1]?.[j] ?? 0, table[i]?.[j + 1] ?? 0);
  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      parts.push({ kind: "equal", text: left[i] ?? "" });
      i++;
      j++;
    } else if (
      j < right.length &&
      (i >= left.length || (table[i]?.[j + 1] ?? 0) >= (table[i + 1]?.[j] ?? 0))
    ) {
      parts.push({ kind: "added", text: right[j] ?? "" });
      j++;
    } else {
      parts.push({ kind: "removed", text: left[i] ?? "" });
      i++;
    }
  }
  return parts;
}
