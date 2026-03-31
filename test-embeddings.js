
const { maia } = require('./connector/dist/maia');
const dotenv = require('dotenv');
const path = require('path');

// Load env from connector
dotenv.config({ path: path.resolve(__dirname, 'connector/.env') });

async function testEmbedding() {
    try {
        console.log("Testing embeddings with baseURL:", process.env.MAIA_BASE_URL);
        const embeddings = await maia.embedDocuments(["Hello world"]);
        console.log("Success! Embedding length:", embeddings[0].length);
    } catch (err) {
        console.error("Embedding failed!");
        console.error("Status:", err.status);
        console.error("Message:", err.message);
        if (err.response) {
            console.error("Response Data:", err.response.data);
        }
    }
}

testEmbedding();
