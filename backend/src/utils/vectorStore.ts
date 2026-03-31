
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Embeddings } from "@langchain/core/embeddings";
import { maia } from "../database";
import { Document } from "@langchain/core/documents";

// Wrapper to make MaiaRouter compatible with LangChain Embeddings interface explicitly if needed
class MaiaEmbeddings extends Embeddings {
    constructor() {
        super({});
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        return await maia.embedDocuments(documents);
    }

    async embedQuery(document: string): Promise<number[]> {
        return await maia.embedQuery(document);
    }
}

export async function createVectorStore(docs: Document[]) {
    const embeddings = new MaiaEmbeddings();
    return await MemoryVectorStore.fromDocuments(docs, embeddings);
}
