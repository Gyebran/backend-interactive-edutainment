import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root directory
// This file must be imported BEFORE any other imports that rely on env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('[ENV] Environment variables loaded from root .env');
