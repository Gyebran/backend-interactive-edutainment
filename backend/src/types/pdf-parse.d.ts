declare module 'pdf-parse' {
    interface PdfParseResult {
        numpages: number;
        numrender: number;
        info: any;
        metadata: any;
        version: string;
        text: string;
    }

    interface PdfParseOptions {
        pagerender?: (pageData: any) => string | Promise<string>;
        max?: number;
        version?: string;
    }

    function PdfParse(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
    export = PdfParse;
}
