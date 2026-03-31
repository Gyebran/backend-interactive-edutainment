"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.db = prisma;
