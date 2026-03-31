import { db } from './db';
import { maia } from './maia';
import dotenv from 'dotenv';
import path from 'path';

// Load env from ROOT (Standardization)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Mocking ContentEngine locally to test the logic without cross-module import issues
class ContentEngine {
    async extractDescription(imageUrl: string): Promise<string> {
        console.log(`[ContentEngine] Analyzing image: ${imageUrl}`);

        const systemPrompt = "You are an expert educational content analyst. Your task is to analyze educational materials (charts, diagrams, text pages) and provide a structured, detailed description.";

        const userPrompt = `Describe this educational material.
        Focus on:
        1. Context/Topic: What is the subject matter?
        2. Text Content: Extract key text visible.
        3. Visual Elements: Describe diagrams, charts, or illustrations.
        4. Key Concepts: What are the main learning points?
        
        Be concise but comprehensive. Max 300 words.`;

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        try {
            const description = await maia.analyzeImage(fullPrompt, imageUrl);
            console.log(`[ContentEngine] Analysis complete. Length: ${description.length} chars.`);
            return description;
        } catch (error) {
            console.error('[ContentEngine] Extraction failed:', error);
            throw error;
        }
    }
}

const contentEngine = new ContentEngine();

const main = async () => {
    console.log('🧪 Starting Vision-to-Text Test (Connector Context)...');

    try {
        // 1. Get a recent image upload
        const lastUpload = await db.uploadData.findFirst({
            where: {
                type: 'IMAGE',
                cloudinaryUrl: { not: null }
            },
            orderBy: { createdAt: 'desc' }
        });

        let imageUrl = '';

        if (!lastUpload || !lastUpload.cloudinaryUrl) {
            console.warn('⚠️ No IMAGE uploads found in DB. using fallback sample image.');
            // Using a sample technical chart for testing analysis
            imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Candlestick_chart_scheme_03-en.svg/1024px-Candlestick_chart_scheme_03-en.svg.png';
        } else {
            console.log(`📸 Found test image: ${lastUpload.cloudinaryUrl}`);
            imageUrl = lastUpload.cloudinaryUrl;
        }

        // 2. Run the Engine
        const description = await contentEngine.extractDescription(imageUrl);

        console.log('\n✨ --- AI Description --- ✨');
        console.log(description);
        console.log('---------------------------\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await db.$disconnect();
    }
};

main();
