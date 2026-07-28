CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "textChecksum" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chunk_organizationId_matterId_documentId_idx" ON "Chunk"("organizationId", "matterId", "documentId");

-- CreateIndex
CREATE INDEX "Chunk_textChecksum_embeddingModel_idx" ON "Chunk"("textChecksum", "embeddingModel");

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_documentVersionId_ordinal_key" ON "Chunk"("documentVersionId", "ordinal");

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
