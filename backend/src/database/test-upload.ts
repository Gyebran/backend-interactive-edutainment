
import { db } from './db';
import { handleImageUpload, handlePdfUpload } from './upload';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { buildTemporaryStudentId } from '../utils/studentId.util';

// Gunakan URL PDF publik yang valid agar diterima oleh Cloudinary
const dummyPdfPath = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf";

async function main() {
    try {
        console.log("🚀 Memulai Test Upload (Connector)...");

        // 1. Pastikan ada User
        console.log("Mencari user test...");
        let user = await db.user.findFirst();
        if (!user) {
            console.log("User tidak ditemukan, membuat user baru...");
            const userId = randomUUID();
            user = await db.user.create({
                data: {
                    id: userId,
                    email: `test-connector-${Date.now()}@example.com`,
                    studentId: buildTemporaryStudentId(userId),
                    name: "Test Connector User",
                    password: '$2a$10$hashedvaluenotrealbutvalidformat' // Dummy hash
                }
            });
        }
        console.log(`✅ Menggunakan User ID: ${user.id}`);

        // 2. Test Upload PDF
        console.log("\n📄 Mencoba Upload PDF (from Public URL)...");
        const pdfResult = await handlePdfUpload(dummyPdfPath, user.id);
        console.log("✅ PDF Upload Berhasil!");
        console.log("ID:", pdfResult.id);
        console.log("URL:", pdfResult.cloudinaryUrl);

        // 3. Test Upload Image
        console.log("\n🖼️ Mencoba Upload Image...");
        const imagePath = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
        const imgResult = await handleImageUpload(imagePath, user.id);
        console.log("✅ Image Upload Berhasil!");
        console.log("ID:", imgResult.id);
        console.log("URL:", imgResult.cloudinaryUrl);

    } catch (error) {
        console.error("❌ Terjadi Error:", error);
    } finally {
        await db.$disconnect();
    }
}

main();
