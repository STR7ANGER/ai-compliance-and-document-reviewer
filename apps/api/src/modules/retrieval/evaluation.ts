export type RetrievalCase = {
  relevantChunkIds: string[];
  rankedChunkIds: string[];
  expectedPages?: number[];
  citedPages?: number[];
};

export function evaluateRetrieval(cases: RetrievalCase[], k = 5) {
  if (cases.length === 0)
    return { recallAtK: 0, meanReciprocalRank: 0, pageAccuracy: 0 };
  let recall = 0;
  let reciprocalRank = 0;
  let pageAccuracy = 0;
  for (const item of cases) {
    const top = item.rankedChunkIds.slice(0, k);
    const found = item.relevantChunkIds.filter((id) => top.includes(id));
    recall += found.length / Math.max(1, item.relevantChunkIds.length);
    const rank = item.rankedChunkIds.findIndex((id) =>
      item.relevantChunkIds.includes(id),
    );
    reciprocalRank += rank < 0 ? 0 : 1 / (rank + 1);
    const expected = item.expectedPages ?? [];
    const cited = item.citedPages ?? [];
    pageAccuracy +=
      expected.length === 0
        ? 1
        : expected.filter((page) => cited.includes(page)).length /
          expected.length;
  }
  return {
    recallAtK: recall / cases.length,
    meanReciprocalRank: reciprocalRank / cases.length,
    pageAccuracy: pageAccuracy / cases.length,
  };
}
