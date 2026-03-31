const BACKEND_URL = process.env.API_URL || "http://localhost:3001";

async function main() {
    console.log(`Connecting to backend at ${BACKEND_URL}...`);
    
    try {
        // Send POST request to trigger batch processing
        console.log("Triggering Batch Asset Processing (Upload + Analyze + Save)...");
        const response = await fetch(`${BACKEND_URL}/api/rag/batch-process`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
            console.log("\n--- BATCH PROCESSING COMPLETE ---\n");
            if (data.results && data.results.length > 0) {
                data.results.forEach((res: any) => {
                    if (res.status === 'success') {
                        console.log(`✅ ${res.file}: Processed & Saved (ID: ${res.id})`);
                    } else {
                        console.error(`❌ ${res.file}: Failed - ${res.error}`);
                    }
                });
            } else {
                console.log("No files were processed.");
            }
            console.log("\n---------------------------------\n");
        } else {
            console.error("Backend Error:", data.error);
        }

    } catch (error) {
        console.error("\n[ERROR] Could not connect to backend.");
        console.error("Make sure your Docker container is running!");
        console.error(`Details: ${error}\n`);
        process.exit(1);
    }
}

main();
