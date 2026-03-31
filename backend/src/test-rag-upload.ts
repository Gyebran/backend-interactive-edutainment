
import { RAGEngine } from './engine/ragEngine';
import path from 'path';
import fs from 'fs';

// Gunakan URL PDF publik yang valid untuk didownload sementara sebagai file test
// Atau gunakan dummy file content
const testFilePath = path.join(__dirname, 'test-rag-doc.pdf');

async function main() {
    try {
        console.log("🚀 Testing Backend RAG Upload Flow...");

         // Buat dummy PDF file (Text based PDF content simulation for PDF Parse)
         // Note: pdf-parse might fail on a text file renamed as .pdf depending on loose parsing.
         // Let's try to simulate a real PDF or just handle the error if pdf-parse fails on fake content.
         // Better: Download a real PDF if possible. Or just write a minimal valid PDF header.
         // Minimal PDF header: %PDF-1.4 ...
         
         const minimalPdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj
xref
0 4
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000110 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
149
%EOF`;
         
         // Using the minimal PDF might not extract text using pdf-parse if it has no fonts/streams.
         // So for this test, we might rely on the fact that handlePdfUpload works (mocked/Cloudinary) 
         // and loadSinglePdf might fail or retry.
         
         // Actually, let's use the URL strategy from before -> But loadSinglePdf expects a LOCAL FILE.
         // So I need to download it first or just copy a file if I had one.
         // I'll create a dummy text file and hope pdf-parse is forgiving or just creates empty text, 
         // OR I will trust the code logic since I reviewed it.
         
         // Let's create a file that pdf-parse can read. pdf-parse basically reads text.
         // Unique workaround: pdf-parse often can read raw text strings if not strictly valid PDF structure.
         
         fs.writeFileSync(testFilePath, "This is a test document content for RAG analysis. Interactive Edutainment is great.");

        const engine = new RAGEngine();
        
        // Use a test user ID
        const userId = "user-test-rag-01";
        
        console.log("Calling processAndSavePdf...");
        // This will:
        // 1. Upload 'test-rag-doc.pdf' to Cloudinary (Connector)
        // 2. Read 'test-rag-doc.pdf' locally (DocumentLoader) -> Note: pdf-parse might throw if invalid specific format
        // 3. Generate Analysis (Maia)
        // 4. Update DB
        
        const result = await engine.processAndSavePdf(testFilePath, userId);
        
        console.log("✅ Workflow Success!");
        console.log("Record ID:", result.record.id);
        console.log("Analysis Summary:", result.analysis);

    } catch (error) {
        console.error("❌ Test Failed:", error);
    } finally {
        // Cleanup
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    }
}

main();
