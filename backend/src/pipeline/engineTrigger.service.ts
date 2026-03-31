import { UploadType } from "@prisma/client";
import { assertValidQuizDescription } from "./quizDescription.util";
import { runQuizGenerationPipeline } from "./enginePipeline.service";

type QuizGenerationTriggerInput = {
    type: UploadType;
    uploadDataId: string;
    aiContent: unknown;
};

export function triggerQuizGenerationAfterDescriptionSave({
    type,
    uploadDataId,
    aiContent,
}: QuizGenerationTriggerInput): void {
    const description = assertValidQuizDescription(aiContent);

    console.log("Triggering quiz generation:", {
        type,
        uploadDataId,
        descriptionLength: description.length,
    });

    triggerQuizGeneration(uploadDataId);
}

/**
 * Triggers the quiz generation pipeline automatically in the background.
 * Validates duplication quickly before executing heavy logic.
 *
 * @param uploadDataId The UUID of the uploaded document whose description just finished generating
 */
export function triggerQuizGeneration(uploadDataId: string): void {
    if (!uploadDataId) {
        console.warn("[EngineTrigger] Invalid uploadDataId provided to trigger.");
        return;
    }

    console.log("Quiz pipeline triggered:", uploadDataId);
    console.log(`[EngineTrigger] Processing trigger for Quiz Generation pipeline -> UploadData ID: ${uploadDataId}`);

    // Trigger pipeline asynchronously immediately, preventing blocking
    // the HTTP response loop or description save operations
    setImmediate(async () => {
        try {
            await runQuizGenerationPipeline(uploadDataId);
        } catch (error) {
            console.error(`[EngineTrigger] Unhandled exception from EnginePipeline for ID: ${uploadDataId}`, error);
        }
    });
}
