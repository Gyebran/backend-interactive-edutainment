import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path from "path";
import fs from "fs";
import pdf = require("pdf-parse");

const getAllPdfFiles = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) { 
            results = results.concat(getAllPdfFiles(filePath));
        } else {
            if (file.toLowerCase().endsWith('.pdf')) {
                results.push(filePath);
            }
        }
    });
    return results;
};

export async function loadAndSplitPDFs(assetsDir: string) {
    if (!fs.existsSync(assetsDir)) {
        console.log(`Assets directory not found: ${assetsDir}`);
        return [];
    }

    const filePaths = getAllPdfFiles(assetsDir);
    
    if (filePaths.length === 0) {
        console.log("No PDF files found in assets directory (recursive search).");
        return [];
    }
    
    console.log(`Found ${filePaths.length} PDF(s) in ${assetsDir}`);

    const allDocs: Document[] = [];
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    for (const filePath of filePaths) {
        // file extraction logic
        const fileName = path.basename(filePath);
        console.log(`Loading ${fileName}...`);
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            
            const docs = [new Document({
                pageContent: data.text,
                metadata: {
                    source: fileName,
                    ...data.info
                }
            })];

            console.log(`Successfully loaded ${fileName}, splitting...`);
            const splitDocs = await splitter.splitDocuments(docs);
            allDocs.push(...splitDocs);
        } catch (err: any) {
            console.error(`Error processing ${fileName}:`, err);
            // Continue with other files even if one fails
        }
    }

    return allDocs;
}

export async function loadSinglePdf(filePath: string) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    console.log(`Loading single PDF ${filePath}...`);
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        
        const docs = [new Document({
            pageContent: data.text,
            metadata: {
                source: path.basename(filePath),
                ...data.info
            }
        })];

        console.log(`Successfully loaded ${path.basename(filePath)}, splitting...`);
        const splitDocs = await splitter.splitDocuments(docs);
        return splitDocs;
    } catch (err: any) {
        console.error(`Error processing ${filePath}:`, err);
        throw err;
    }
}
