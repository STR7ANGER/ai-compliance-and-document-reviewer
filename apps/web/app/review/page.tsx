import { ReviewConsole } from "./review-console.js";
export default function ReviewPage() {
  return (
    <main>
      <section className="hero compact">
        <p className="eyebrow">Secure intake</p>
        <h1>Quarantine and review a document.</h1>
      </section>
      <ReviewConsole />
    </main>
  );
}
