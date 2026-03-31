function extractStringValue(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export function extractQuizDescription(aiContent: unknown): string {
    if (typeof aiContent === "string") {
        return aiContent.trim();
    }

    if (!aiContent || typeof aiContent !== "object") {
        return "";
    }

    const content = aiContent as Record<string, unknown>;

    return (
        extractStringValue(content.summary) ||
        extractStringValue(content.description) ||
        extractStringValue(content.analysis)
    );
}

export function assertValidQuizDescription(aiContent: unknown): string {
    const description = extractQuizDescription(aiContent);
    const normalizedDescription = description.toLowerCase();
    const invalidDescriptions = new Set([
        "ai processing failed",
        "image upload failed",
        "pdf upload failed",
    ]);

    if (!description || description.length < 20 || invalidDescriptions.has(normalizedDescription)) {
        throw new Error("Invalid description for quiz generation");
    }

    return description;
}
