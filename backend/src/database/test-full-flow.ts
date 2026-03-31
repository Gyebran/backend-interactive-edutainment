import { handleImageUpload, updateAiContent, db } from './index';
import { maia } from './maia';
import dotenv from 'dotenv';
import path from 'path';

// Load env from ROOT
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const main = async () => {
    console.log('🧪 Testing Full Flow Logic...');

    try {
        // 1. Get a valid User
        const user = await db.user.findFirst();
        if (!user) throw new Error('No user found in DB. Run seed first.');
        console.log(`👤 Using User: ${user.id} (${user.email})`);

        // 2. Simulate Image Upload (using a sample URL as 'file' for mock, 
        //    or we can try to upload a real small base64 if we had one. 
        //    For now, let's just pass a URL and see if handleImageUpload accepts it 
        //    (Cloudinary upload usually expects file path or base64).
        //    Let's use a real sample image URL for simplicity in "upload" mock if it supports it, 
        //    but `uploader.upload` supports URLs too.)

        const sampleImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Candlestick_chart_scheme_03-en.svg/1024px-Candlestick_chart_scheme_03-en.svg.png";

        console.log('☁️  Simulating Upload to Cloudinary...');
        const record = await handleImageUpload(sampleImageUrl, user.id);
        console.log(`✅ Upload Record Created: ${record.id}`);

        // 3. Analyze with AI
        console.log('🧠 Sending to AI...');
        // We replicate content.engine logic here roughly or just call api directly
        const prompt = "Describe this educational chart.";
        const description = await maia.analyzeImage(prompt, record.cloudinaryUrl || sampleImageUrl);
        console.log(`✨ AI Response Length: ${description.length}`);

        // 4. Update DB
        console.log('💾 Updating DB...');
        await updateAiContent(record.id, { description });
        console.log('✅ Flow Complete!');

    } catch (error: any) {
        const fs = require('fs');
        fs.writeFileSync('error.log', `Message: ${error.message}\nStack: ${error.stack}`);
        console.log('❌ Error written to error.log');
    } finally {
        await db.$disconnect();
    }
};

main();
