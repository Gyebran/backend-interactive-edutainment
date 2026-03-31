import { loadAndSplitPDFs, loadSinglePdf } from "../utils/documentLoader";
import { maia, handlePdfUpload, updateAiContent, db } from "../database";
import path from "path";
import fs from "fs";

function safeParseAiResponse(aiResponse: string) {
    try {
        return JSON.parse(aiResponse);
    } catch (_error) {
        console.error("AI response is not JSON:", aiResponse);
        return {
            summary: aiResponse,
            fallback: true,
        };
    }
}

export class RAGEngine {
    private vectorStore: any = null;
    private allDocs: any[] = [];

    async initialize() {
        console.log("Initializing RAG Engine (Direct Context Mode)...");
        const assetsDir = path.resolve(__dirname, "../../../assets");

        console.log(`Scanning assets at: ${assetsDir}`);
        this.allDocs = await loadAndSplitPDFs(assetsDir);

        if (this.allDocs.length === 0) {
            console.warn("No documents found. Summary will not be possible.");
            return;
        }

        console.log("RAG Engine Initialization Complete (Embeddings disabled).");
    }

    async generateSummary(): Promise<string> {
        if (this.allDocs.length === 0) {
            throw new Error("No context available for summary.");
        }

        console.log("Using full document context (Direct Mode)...");
        const context = this.allDocs.map((doc: any) => doc.pageContent).join("\n\n");

        if (!context) {
            throw new Error("No context available for summary.");
        }

        const prompt = `
You are an expert analyst. Your task is to provide a comprehensive summary of the document based on the provided text fragments.

Instructions:
1. Synthesize the information from the Context fragments below.
2. Create a cohesive summary of the entire document's content.
3. Organize the summary with main topics/chapters if evident.
4. Highlight the most important guidelines, requirements, or definitions found.

Context Fragments:
${context}

Comprehensive Summary:
`;

        console.log("Generating summary using Maia...");
        return await maia.generateContent(prompt);
    }

    async processAndSavePdf(filePath: string, userId: string, config?: any): Promise<any> {
        console.log(`Processing and saving PDF: ${filePath} for user: ${userId}`);

        // 1. Upload PDF to Cloudinary & Save Initial Record
        // Note: handlePdfUpload expects a path or base64. 
        // If this is a real upload, filePath should be the temp path of the uploaded file.
        const record = await handlePdfUpload(filePath, userId);
        if (!record) {
            throw new Error('Failed to create upload record.');
        }

        let analysis = 'AI processing failed';
        let aiData: Record<string, unknown> = {
            summary: 'AI processing failed',
            error: true,
            fallback: true,
            analyzedAt: new Date().toISOString(),
            quizConfig: config || {
                difficulty: 'random',
                questionCount: 10,
                language: 'id',
            },
        };

        try {
            // 2. Load and Analyze PDF content
            const docs = await loadSinglePdf(filePath);
            const context = docs.map((doc: any) => doc.pageContent).join("\n\n");

            const prompt = `
You are an expert analyst. Your task is to analyze the uploaded document.

Instructions:
1. Provide a concise summary of the document.
2. List key points or takeaways.
3. If it's a test or quiz, extract the questions.
4. Use Indonesian language.

Document Content:
${context}

Analysis:
`;

            console.log("Generating analysis for uploaded PDF...");
            analysis = await maia.generateContent(prompt);
            console.log("AI Response:", analysis);
            const parsedAnalysis = safeParseAiResponse(analysis);

            aiData = {
                ...(parsedAnalysis && typeof parsedAnalysis === 'object' ? parsedAnalysis : {}),
                summary:
                    parsedAnalysis && typeof parsedAnalysis === 'object' && 'summary' in parsedAnalysis
                        ? (parsedAnalysis as { summary?: unknown }).summary ?? analysis
                        : analysis,
                analyzedAt: new Date().toISOString(),
                quizConfig: config || {
                    difficulty: 'random',
                    questionCount: 10,
                    language: 'id',
                },
            };
        } catch (error) {
            console.error('[RAGEngine] AI failed:', error);
            aiData = {
                summary: 'AI processing failed',
                error: true,
                fallback: true,
                analyzedAt: new Date().toISOString(),
                message: error instanceof Error ? error.message : String(error),
                quizConfig: config || {
                    difficulty: 'random',
                    questionCount: 10,
                    language: 'id',
                },
            };
            analysis = String(aiData.summary);
        }

        await updateAiContent(record.id, aiData);

        console.log(`Analysis complete and saved for record: ${record.id}`);
        return {
            record,
            analysis
        };
    }

    async batchProcessAssets(userId: string = "system-batch-runner"): Promise<any[]> {
        console.log("Starting Batch Processing of Assets...");
        const assetsDir = path.resolve(__dirname, "../../../assets");

        // Use helper to find all PDFs (similar to documentLoader, but we just need paths)
        // Helper function inside method for simplicity or moved to utils in future
        const getAllPdfFiles = (dir: string): string[] => {
            let results: string[] = [];
            if (!fs.existsSync(dir)) return [];

            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(getAllPdfFiles(filePath));
                } else {
                    if (file.toLowerCase().endsWith('.pdf')) {
                        results.push(filePath);
                    }
                }
            });
            return results;
        };

        const filePaths = getAllPdfFiles(assetsDir);

        if (filePaths.length === 0) {
            console.warn("No PDF files found for batch processing.");
            return [];
        }

        console.log(`Found ${filePaths.length} PDFs to process.`);
        const results = [];

        // Ensure a valid user exists for system-batch-runner

        let batchUserId = userId;

        // If using the default system ID, we must make sure it exists in DB, or finding any valid user
        if (userId === "system-batch-runner") {
            const anyUser = await db.user.findFirst();
            if (anyUser) {
                console.log(`Using existing user for batch process: ${anyUser.email} (${anyUser.id})`);
                batchUserId = anyUser.id;
            } else {
                console.log("No users found. Creating system batch user...");
                const newUser = await db.user.create({
                    data: {
                        email: `batch-runner-${Date.now()}@system.local`,
                        name: "System Batch Runner",
                        password: "system-batch-runner-needs-no-password-hash" // Dummy for system user
                    }
                });
                batchUserId = newUser.id;
            }
        }

        for (const filePath of filePaths) {
            try {
                // Check if already processed (Optional: skipped for now to ensure we fulfill request)
                // For now, always process.
                // Pass the VALID batchUserId, not the raw "system-batch-runner" string which might not exist in User table
                const result = await this.processAndSavePdf(filePath, batchUserId);
                results.push({
                    file: path.basename(filePath),
                    status: "success",
                    id: result.record.id
                });
            } catch (error: any) {
                console.error(`Failed to process ${path.basename(filePath)}:`, error);
                results.push({
                    file: path.basename(filePath),
                    status: "error",
                    error: error.message
                });
            }
        }

        return results;
    }
}


