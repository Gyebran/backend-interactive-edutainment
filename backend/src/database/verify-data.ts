import { db } from './db';
import dotenv from 'dotenv';
import path from 'path';

// Load env from ROOT
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const main = async () => {
    console.log('🔍 Verifying Database Content...');
    try {
        const users = await db.user.findMany();
        console.log(`\n👥 Users Found: ${users.length}`);
        users.forEach(u => console.log(`- ID: ${u.id} | Email: ${u.email} | Name: ${u.name}`));

        const uploads = await db.uploadData.findMany();
        console.log(`\n📂 Uploads Found: ${uploads.length}`);

    } catch (error) {
        console.error('❌ DB Verification Failed:', error);
    } finally {
        await db.$disconnect();
    }
};

main();
