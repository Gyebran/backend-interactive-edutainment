"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    secure: true
});
exports.storage = cloudinary_1.v2;
