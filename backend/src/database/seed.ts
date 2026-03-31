import { db } from './db';
import { handlePdfDescription, handleImageUpload } from './upload';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { buildTemporaryStudentId } from '../utils/studentId.util';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const main = async () => {
    console.log('🌱 Starting dummy data seeder...');

    try {
        // 1. Create Dummy User "User A"
        const userEmail = 'usera@example.com';
        let user = await db.user.findUnique({ where: { email: userEmail } });

        if (!user) {
            const userId = randomUUID();
            user = await db.user.create({
                data: {
                    id: userId,
                    email: userEmail,
                    studentId: buildTemporaryStudentId(userId),
                    name: 'User A',
                    password: '$2a$10$hashedvaluenotrealbutvalidformat' // Dummy hash
                },
            });
            console.log(`✅ User created: ${user.name} (${user.email})`);
        } else {
            console.log(`ℹ️ User already exists: ${user.name} (${user.id})`);
        }

        // 2. Seed PDF Description (AI Content)
        const dummyAiContent = {
            title: "FICPACT CUP 2026 Rules",
            summary: "Official rules and guidelines for the FICPACT CUP 2026 tournament, featuring chess, ludo, and dominoes.",
            keywords: ["tournament", "games", "2026", "rules"],
            sentiment: "Neutral"
        };

        await handlePdfDescription(dummyAiContent, user.id);

        // 3. Seed Image Upload
        // We try to look for the specific image "FICPACT_CUP_2026.png" in the connector root or src.
        // Assuming user might place it in connector folder.
        const imageFilename = 'FICPACT_CUP_2026.png';
        const localImagePath = path.join(__dirname, '..', imageFilename); // ../ points to connector root

        if (process.env.CLOUDINARY_URL) {
            try {
                if (fs.existsSync(localImagePath)) {
                    console.log(`Uploading local file: ${localImagePath}`);
                    await handleImageUpload(localImagePath, user.id);
                } else {
                    console.log(`ℹ️ Local file '${imageFilename}' not found in connector folder.`);
                    console.log("ℹ️ Uploading remote sample as fallback to simulate.");
                    await handleImageUpload('https://res.cloudinary.com/demo/image/upload/sample.jpg', user.id);
                }
            } catch (e) {
                console.error("⚠️ Cloudinary upload failed:", e);
            }
        } else {
            console.log("ℹ️ No CLOUDINARY_URL found, skipping actual upload.");
        }

        console.log('✅ Seeding completed successfully!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
};

main();
