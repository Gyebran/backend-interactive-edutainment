import { v2 as cloudinary } from 'cloudinary';


// Ensure environment variables are loaded if running as standalone script
// In Docker/Next.js properly configured, these are injected.
if (!process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_URL) {
    // If only URL is present, usually cloudinary handles it auto, but let's be safe
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

export const storage = cloudinary;
