import { createHash } from "node:crypto";

export type PageText = { page: number; text: string };
export type TextChunk = {
  ordinal: number;
  pageStart: number;
  pageEnd: number;
  text: string;
  checksum: string;
};

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean);
export const chunkPages = (
  pages: PageText[],
  target = 800,
  overlap = 120,
): TextChunk[] => {
  const chunks: TextChunk[] = [];
  for (const page of pages) {
    const tokens = words(page.text);
    for (let start = 0; start < tokens.length; start += target - overlap) {
      const slice = tokens.slice(start, start + target);
      if (!slice.length) break;
      const text = slice.join(" ");
      chunks.push({
        ordinal: chunks.length,
        pageStart: page.page,
        pageEnd: page.page,
        text,
        checksum: createHash("sha256").update(text).digest("hex"),
      });
      if (start + target >= tokens.length) break;
    }
  }
  return chunks;
};

export class HashEmbedder {
  readonly model = "local-token-hash-v1";
  readonly dimensions = 768;
  embed(text: string) {
    const vector = new Array<number>(this.dimensions).fill(0);
    for (const token of words(text.toLowerCase())) {
      const digest = createHash("sha256").update(token).digest();
      const index = digest.readUInt16BE(0) % this.dimensions;
      vector[index] = (vector[index] ?? 0) + ((digest[2] ?? 0) % 2 ? 1 : -1);
    }
    const magnitude =
      Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }
}
