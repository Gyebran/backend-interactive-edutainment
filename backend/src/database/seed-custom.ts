import { db } from './db';
import { handleImageUpload, handlePdfUpload } from './upload';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { buildTemporaryStudentId } from '../utils/studentId.util';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ASSETS_DIR = path.resolve(__dirname, '../../assets');

const main = async () => {
    console.log('🌱 Starting REAL ASSET seeder...');
    console.log(`📂 Scanning assets directory: ${ASSETS_DIR}`);

    try {
        // 1. Get/Create User A
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
            console.log(`✅ User created: ${user.name}`);
        } else {
            console.log(`ℹ️ User found: ${user.name}`);
        }

        // 2. Scan and Upload Images
        const imgDir = path.join(ASSETS_DIR, 'img');
        if (fs.existsSync(imgDir)) {
            const imageFiles = fs.readdirSync(imgDir);
            console.log(`Found ${imageFiles.length} images.`);

            for (const file of imageFiles) {
                const filePath = path.join(imgDir, file);
                // Simple check to ensure it's a file
                if (fs.lstatSync(filePath).isFile()) {
                    console.log(`⬆️ Uploading Image: ${file}...`);
                    await handleImageUpload(filePath, user.id);
                }
            }
        } else {
            console.warn(`⚠️ Image directory not found: ${imgDir}`);
        }

        // 3. Scan and Upload PDFs
        const pdfDir = path.join(ASSETS_DIR, 'pdf');
        if (fs.existsSync(pdfDir)) {
            const pdfFiles = fs.readdirSync(pdfDir);
            console.log(`Found ${pdfFiles.length} PDFs.`);

            for (const file of pdfFiles) {
                const filePath = path.join(pdfDir, file);
                if (fs.lstatSync(filePath).isFile()) {
                    console.log(`⬆️ Uploading PDF: ${file}...`);
                    await handlePdfUpload(filePath, user.id);
                }
            }
        } else {
            console.warn(`⚠️ PDF directory not found: ${pdfDir}`);
        }

        console.log('✅ Real asset seeding completed!');

    } catch (error: any) {
        console.error('❌ Seeding failed!');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        if (error.meta) console.error('Error Meta:', JSON.stringify(error.meta));
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
};

main();
