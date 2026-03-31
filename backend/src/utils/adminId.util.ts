export function normalizeAdminId(adminId: string) {
    return adminId.trim();
}

export function validateAdminId(adminId: unknown) {
    if (typeof adminId !== 'string') {
        return null;
    }

    const normalizedAdminId = normalizeAdminId(adminId);

    if (normalizedAdminId.length < 5) {
        return null;
    }

    return normalizedAdminId;
}

export function assertValidAdminId(adminId: unknown) {
    const normalizedAdminId = validateAdminId(adminId);

    if (!normalizedAdminId) {
        throw new Error('INVALID_ADMIN_ID');
    }

    return normalizedAdminId;
}
