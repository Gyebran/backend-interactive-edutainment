
import OpenAI from 'openai';
import { openaiConfig } from './openai';

type ChatMessageInput = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

export class MaiaRouter {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: openaiConfig.apiKey,
            baseURL: openaiConfig.baseURL,
        });
    }

    get modelName(): string {
        return openaiConfig.modelName;
    }

    async generateContent(prompt: string, options?: { temperature?: number; response_format?: { type: "json_object" } }): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: openaiConfig.modelName,
                messages: [{ role: 'user', content: prompt }],
                ...(options?.temperature !== undefined && { temperature: options.temperature }),
                ...(options?.response_format !== undefined && { response_format: options.response_format }),
            });
            return response.choices[0].message.content || '';
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }

    async generateChat(messages: ChatMessageInput[], options?: { temperature?: number }): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: openaiConfig.modelName,
                messages,
                ...(options?.temperature !== undefined && { temperature: options.temperature }),
            });

            return response.choices[0].message.content || '';
        } catch (error) {
            console.error('Error generating chat completion:', error);
            throw error;
        }
    }

    async analyzeImage(prompt: string, imageUrl: string): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: openaiConfig.visionModelName,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl,
                                },
                            },
                        ],
                    },
                ],
            });
            return response.choices[0].message.content || '';
        } catch (error) {
            console.error('Error analyzing image:', error);
            throw error;
        }
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        try {
            const batchSize = 20;
            const allEmbeddings: number[][] = [];
            const model = process.env.MODEL_EMBEDDING || 'text-embedding-3-small';

            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                console.log(`Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}...`);
                const response = await this.client.embeddings.create({
                    model: model,
                    input: batch,
                });
                allEmbeddings.push(...response.data.map(item => item.embedding));
            }
            return allEmbeddings;
        } catch (error) {
            throw error;
        }
    }

    async embedQuery(text: string): Promise<number[]> {
        try {
            const model = process.env.MODEL_EMBEDDING || 'text-embedding-3-small';
            const response = await this.client.embeddings.create({
                model: model,
                input: text,
            });
            return response.data[0].embedding;
        } catch (error) {
            throw error;
        }
    }
}

export const maia = new MaiaRouter();
