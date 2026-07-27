"use client";
import { type FormEvent, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3011";
export function ReviewConsole() {
  const [apiKey, setApiKey] = useState("");
  const [matterId, setMatterId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [status, setStatus] = useState("Choose a PDF or DOCX up to 25 MiB.");
  const [document, setDocument] = useState<Record<string, unknown> | null>(
    null,
  );
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File)) return;
    setStatus("Hashing document locally…");
    const hash = await crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer(),
    );
    const sha256 = [...new Uint8Array(hash)]
      .map((part) => part.toString(16).padStart(2, "0"))
      .join("");
    const headers = {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    };
    const intentResponse = await fetch(`${api}/v1/uploads/intents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        matterId,
        filename: file.name,
        mediaType: file.type,
        sizeBytes: file.size,
        sha256,
        classification: form.get("classification"),
      }),
    });
    const intent = (await intentResponse.json()) as {
      uploadId?: string;
      objectKey?: string;
      uploadUrl?: string;
      error?: { code?: string };
    };
    if (
      !intentResponse.ok ||
      !intent.uploadUrl ||
      !intent.uploadId ||
      !intent.objectKey
    )
      return setStatus(`Upload rejected: ${intent.error?.code ?? "UNKNOWN"}`);
    setStatus("Uploading to quarantine…");
    const put = await fetch(intent.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type, "x-amz-meta-sha256": sha256 },
      body: file,
    });
    if (!put.ok) return setStatus("Object upload failed.");
    const finalized = await fetch(`${api}/v1/uploads/finalize`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        uploadId: intent.uploadId,
        objectKey: intent.objectKey,
      }),
    });
    const result = (await finalized.json()) as {
      id?: string;
      error?: { code?: string };
    };
    if (!finalized.ok || !result.id)
      return setStatus(`Finalize rejected: ${result.error?.code ?? "UNKNOWN"}`);
    setDocumentId(result.id);
    setStatus("Document quarantined. Malware scan is queued.");
  }
  async function loadDocument() {
    const response = await fetch(`${api}/v1/documents/${documentId}`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const result = (await response.json()) as Record<string, unknown>;
    if (!response.ok) return setStatus("Document could not be loaded.");
    setDocument(result);
    setStatus(
      result.status === "READY"
        ? "Document ready for review."
        : `Pipeline status: ${String(result.status)}`,
    );
  }
  return (
    <section className="panel">
      <form onSubmit={upload}>
        <label>
          Reviewer API key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
        </label>
        <label>
          Matter ID
          <input
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            required
          />
        </label>
        <label>
          Classification
          <select name="classification" defaultValue="CONFIDENTIAL">
            <option>PUBLIC</option>
            <option>INTERNAL</option>
            <option>CONFIDENTIAL</option>
            <option>RESTRICTED</option>
          </select>
        </label>
        <label>
          Document
          <input
            name="file"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
          />
        </label>
        <button type="submit">Upload to quarantine</button>
      </form>
      <hr />
      <label>
        Document ID
        <input
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={loadDocument}
        disabled={!apiKey || !documentId}
      >
        Refresh status
      </button>
      <p className="status" aria-live="polite">
        {status}
      </p>
      {document && <pre>{JSON.stringify(document, null, 2)}</pre>}
      {typeof document?.viewerUrl === "string" && (
        <iframe title="Document viewer" src={document.viewerUrl} />
      )}
    </section>
  );
}
