// multer.ts
import multer from "multer";

// Memory storage (deploy safe)
const storage = multer.memoryStorage();

export const upload = multer({ storage });
