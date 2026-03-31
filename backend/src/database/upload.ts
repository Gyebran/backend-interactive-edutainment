import { db } from './db';
import { storage } from './cloudinary';
import { UploadType } from '@prisma/client';
import { triggerQuizGenerationAfterDescriptionSave } from '../pipeline';
import { getStudentIdSnapshotByUserId } from '../utils/studentId.util';

async function createInitialUploadRecord(type: UploadType, userId: string) {
    const studentId = await getStudentIdSnapshotByUserId(userId);

    return db.uploadData.create({
        data: {
            userId,
            studentId,
            type,
            cloudinaryUrl: null,
            aiContent: {
                status: 'pending',
            },
        },
    });
}

async function updateUploadRecord(recordId: string, data: { cloudinaryUrl?: string | null; aiContent?: any }) {
    return db.uploadData.update({
        where: { id: recordId },
        data,
    });
}

/**
 * Simulates handling an image upload to Cloudinary and saving the record.
 * @param filePath - Path or Base64 string of the file (Simulated for this boilerplate)
 * @param userId - ID of the user owning this asset
 */
export const handleImageUpload = async (filePath: string, userId: string) => {
    const record = await createInitialUploadRecord(UploadType.IMAGE, userId);

    try {
        // 1. Upload to Cloudinary
        // In a real app, you would stream the file buffer here.
        // For boilerplate/testing, we assume we are just passing a path or we might need to mock this if no actual file.
        console.log(`[Mock] Uploading ${filePath} to Cloudinary...`);

        // Example Cloudinary upload call:
        const uploadResult = await storage.uploader.upload(filePath, {
            folder: 'interactive-edutainment',
        });
        console.log('Cloudinary URL:', uploadResult.secure_url);

        const updatedRecord = await updateUploadRecord(record.id, {
            cloudinaryUrl: uploadResult.secure_url,
            aiContent: {
                status: 'uploaded',
            },
        });

        console.log(`[Success] Image uploaded and saved: ${record.id}`);
        return updatedRecord;
    } catch (error) {
        console.error('Error handling image upload:', error);
        await updateUploadRecord(record.id, {
            aiContent: {
                error: true,
                stage: 'upload',
                summary: 'Image upload failed',
                message: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    }
};

/**
 * Handles saving an AI-generated PDF description.
 * @param descriptionData - The JSON object returned by the AI
 * @param userId - ID of the user
 */
export const handlePdfDescription = async (descriptionData: any, userId: string) => {
    try {
        const studentId = await getStudentIdSnapshotByUserId(userId);
        const record = await db.uploadData.create({
            data: {
                userId,
                studentId,
                type: UploadType.PDF_DESCRIPTION,
                aiContent: descriptionData,
            },
        });

        console.log(`[Success] PDF Description saved: ${record.id}`);
        return record;
    } catch (error) {
        console.error('Error handling PDF description:', error);
        throw error;
    }
};

/**
 * Retrieves all assets for a specific user.
 * @param userId 
 */
export const getUserAssets = async (userId: string) => {
    try {
        const assets = await db.uploadData.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return assets;
    } catch (error) {
        console.error('Error retrieving user assets:', error);
        throw error;
    }
};

/**
 * Handles uploading a PDF to Cloudinary and saving the record.
 * @param filePath - Path or Base64 string of the file
 * @param userId - ID of the user
 */
export const handlePdfUpload = async (filePath: string, userId: string) => {
    const record = await createInitialUploadRecord(UploadType.PDF, userId);

    try {
        console.log(`[Mock] Uploading PDF ${filePath} to Cloudinary...`);

        const uploadResult = await storage.uploader.upload(filePath, {
            folder: 'interactive-edutainment',
            resource_type: 'auto'
        });
        console.log('Cloudinary URL:', uploadResult.secure_url);

        const updatedRecord = await updateUploadRecord(record.id, {
            cloudinaryUrl: uploadResult.secure_url,
            aiContent: {
                status: 'uploaded',
            },
        });

        console.log(`[Success] PDF uploaded and saved: ${record.id}`);
        return updatedRecord;
    } catch (error) {
        console.error('Error handling PDF upload:', error);
        await updateUploadRecord(record.id, {
            aiContent: {
                error: true,
                stage: 'upload',
                summary: 'PDF upload failed',
                message: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    }
};

/**
 * Updates the aiContent of an existing upload record.
 * @param recordId - The ID of the uploadData record
 * @param aiData - The JSON object to store in aiContent
 */
export const updateAiContent = async (recordId: string, aiData: any) => {
    try {
        const record = await db.uploadData.update({
            where: { id: recordId },
            data: {
                aiContent: aiData
            }
        });
        console.log(`[Success] AI Content updated for record: ${recordId}`);

        try {
            triggerQuizGenerationAfterDescriptionSave({
                type: record.type,
                uploadDataId: record.id,
                aiContent: aiData,
            });
        } catch (error) {
            console.error("Quiz generation failed:", error);
        }

        return record;
    } catch (error) {
        console.error('Error updating AI content:', error);
        throw error;
    }
};
