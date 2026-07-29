export class Metrics {
  private readonly counters = new Map<string, number>();
  increment(name: string, labels: Record<string, string> = {}) {
    this.incrementBy(name, 1, labels);
  }
  incrementBy(
    name: string,
    amount: number,
    labels: Record<string, string> = {},
  ) {
    if (!/^[a-z][a-z0-9_]*$/.test(name))
      throw new Error("Invalid metric name.");
    const suffix = Object.entries(labels)
      .sort()
      .map(([key, value]) => `${key}="${value.replaceAll('"', "")}"`)
      .join(",");
    const metric = `${name}{${suffix}}`;
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + amount);
  }
  render() {
    return [...this.counters]
      .map(([key, value]) => `review_${key} ${value}`)
      .join("\n");
  }
}
