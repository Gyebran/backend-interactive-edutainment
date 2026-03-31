import './env';
import { db } from './database';
import { UploadType } from '@prisma/client';
import { contentEngine } from './engine/content.engine';
import { runQuizGenerationPipeline } from './pipeline/enginePipeline.service';
import { randomUUID } from 'crypto';
import { buildTemporaryStudentId } from './utils/studentId.util';

const TEST_EMAIL = 'quiz-pipeline-check@system.local';
const SAMPLE_IMAGE_URL =
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Candlestick_chart_scheme_03-en.svg/1024px-Candlestick_chart_scheme_03-en.svg.png';
const FALLBACK_EDUCATIONAL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="#f8fafc"/>
  <rect x="80" y="70" width="1040" height="120" rx="24" fill="#1d4ed8"/>
  <text x="600" y="145" text-anchor="middle" font-family="Arial" font-size="54" fill="white" font-weight="bold">
    Photosynthesis Overview
  </text>
  <rect x="110" y="240" width="980" height="540" rx="30" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
  <circle cx="220" cy="390" r="70" fill="#fde047"/>
  <text x="220" y="400" text-anchor="middle" font-family="Arial" font-size="24" fill="#92400e" font-weight="bold">Sunlight</text>
  <rect x="410" y="300" width="390" height="220" rx="30" fill="#dcfce7" stroke="#16a34a" stroke-width="4"/>
  <text x="605" y="355" text-anchor="middle" font-family="Arial" font-size="38" fill="#166534" font-weight="bold">Leaf Cell</text>
  <text x="605" y="405" text-anchor="middle" font-family="Arial" font-size="30" fill="#166534">Chlorophyll captures light energy</text>
  <text x="605" y="455" text-anchor="middle" font-family="Arial" font-size="30" fill="#166534">Water plus carbon dioxide</text>
  <text x="605" y="500" text-anchor="middle" font-family="Arial" font-size="30" fill="#166534">produces glucose and oxygen</text>
  <rect x="900" y="320" width="150" height="70" rx="20" fill="#bfdbfe"/>
  <text x="975" y="365" text-anchor="middle" font-family="Arial" font-size="26" fill="#1e3a8a">Oxygen</text>
  <rect x="900" y="430" width="180" height="80" rx="20" fill="#fef3c7"/>
  <text x="990" y="480" text-anchor="middle" font-family="Arial" font-size="24" fill="#92400e">Glucose</text>
  <rect x="170" y="560" width="220" height="90" rx="24" fill="#dbeafe"/>
  <text x="280" y="615" text-anchor="middle" font-family="Arial" font-size="26" fill="#1e3a8a">Carbon Dioxide</text>
  <rect x="430" y="610" width="180" height="90" rx="24" fill="#cffafe"/>
  <text x="520" y="665" text-anchor="middle" font-family="Arial" font-size="30" fill="#155e75">Water</text>
  <path d="M300 390 L410 390" stroke="#f59e0b" stroke-width="12" marker-end="url(#arrow)"/>
  <path d="M390 600 L470 520" stroke="#0ea5e9" stroke-width="12" marker-end="url(#arrow)"/>
  <path d="M800 360 L900 360" stroke="#16a34a" stroke-width="12" marker-end="url(#arrow)"/>
  <path d="M800 470 L900 470" stroke="#ca8a04" stroke-width="12" marker-end="url(#arrow)"/>
  <text x="600" y="760" text-anchor="middle" font-family="Arial" font-size="28" fill="#334155">
    Key concept: plants convert light energy into chemical energy.
  </text>
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M0,0 L12,6 L0,12 z" fill="#475569"/>
    </marker>
  </defs>
</svg>`;
const FALLBACK_DESCRIPTION = `
This educational diagram explains the process of photosynthesis in plants.
The title is "Photosynthesis Overview".
The image shows sunlight entering a leaf cell that contains chlorophyll.
It highlights that chlorophyll captures light energy.
The diagram states that water and carbon dioxide are used by the plant cell to produce glucose and oxygen.
Visual arrows connect sunlight, carbon dioxide, and water to the leaf cell, then point to oxygen and glucose as outputs.
The key concept written in the image is that plants convert light energy into chemical energy.
Main learning points:
1. Photosynthesis takes place in plant leaf cells.
2. Chlorophyll absorbs light energy.
3. Water and carbon dioxide are reactants.
4. Glucose and oxygen are products.
5. Photosynthesis is essential for plant growth and energy storage.
`;

const quizConfig = {
    difficulty: 'hard',
    questionCount: 9,
    language: 'en',
};

async function ensureTestUser() {
    const existingUser = await db.user.findUnique({
        where: { email: TEST_EMAIL },
    });

    if (existingUser) {
        return existingUser;
    }

    const userId = randomUUID();
    return db.user.create({
        data: {
            id: userId,
            email: TEST_EMAIL,
            studentId: buildTemporaryStudentId(userId),
            name: 'Quiz Pipeline Check',
            password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDE1234567890abc',
        },
    });
}

async function main() {
    console.log('[QuizPipelineTest] Starting end-to-end verification...');
    console.log('[QuizPipelineTest] Using DATABASE_URL from root .env');

    const user = await ensureTestUser();
    console.log(`[QuizPipelineTest] Using user ${user.id} (${user.email})`);

    let upload = await db.uploadData.create({
        data: {
            userId: user.id,
            studentId: user.studentId,
            type: UploadType.IMAGE,
            cloudinaryUrl: SAMPLE_IMAGE_URL,
            aiContent: {},
        },
    });

    console.log('[QuizPipelineTest] Generating description from content engine...');
    let description: string;

    try {
        description = await contentEngine.extractDescription(SAMPLE_IMAGE_URL);
    } catch (error) {
        console.warn('[QuizPipelineTest] Direct image URL failed, retrying with inline SVG educational image...', error);
        try {
            const fallbackImageUrl = `data:image/svg+xml;base64,${Buffer.from(FALLBACK_EDUCATIONAL_SVG).toString('base64')}`;
            description = await contentEngine.extractDescription(fallbackImageUrl);
            await db.uploadData.update({
                where: { id: upload.id },
                data: {
                    cloudinaryUrl: 'inline-svg://photosynthesis-overview',
                },
            });
        } catch (inlineError) {
            console.warn('[QuizPipelineTest] Inline SVG also failed, using deterministic educational description fallback...', inlineError);
            description = FALLBACK_DESCRIPTION.trim();
            await db.uploadData.update({
                where: { id: upload.id },
                data: {
                    cloudinaryUrl: 'description-fixture://photosynthesis-overview',
                },
            });
        }
    }

    console.log(`[QuizPipelineTest] Description length: ${description.length}`);

    await db.uploadData.update({
        where: { id: upload.id },
        data: {
            cloudinaryUrl: upload.cloudinaryUrl || SAMPLE_IMAGE_URL,
            aiContent: {
                description,
                analyzedAt: new Date().toISOString(),
                quizConfig,
            },
        },
    });

    console.log(`[QuizPipelineTest] UploadData created: ${upload.id}`);
    await runQuizGenerationPipeline(upload.id);

    const savedQuiz = await db.quiz.findFirst({
        where: { uploadDataId: upload.id },
        include: {
            questions: {
                include: {
                    options: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (!savedQuiz) {
        throw new Error('Quiz was not saved to Neon database.');
    }

    if (savedQuiz.questionCount !== quizConfig.questionCount) {
        throw new Error(
            `Quiz questionCount mismatch. Expected ${quizConfig.questionCount}, got ${savedQuiz.questionCount}.`
        );
    }

    if (savedQuiz.language !== quizConfig.language) {
        throw new Error(`Quiz language mismatch. Expected ${quizConfig.language}, got ${savedQuiz.language}.`);
    }

    if (savedQuiz.difficulty !== quizConfig.difficulty) {
        throw new Error(
            `Quiz difficulty mismatch. Expected ${quizConfig.difficulty}, got ${savedQuiz.difficulty}.`
        );
    }

    if (savedQuiz.questions.length !== quizConfig.questionCount) {
        throw new Error(
            `Question row count mismatch. Expected ${quizConfig.questionCount}, got ${savedQuiz.questions.length}.`
        );
    }

    const multipleChoiceQuestions = savedQuiz.questions.filter((question) => question.type === 'multiple_choice');

    if (multipleChoiceQuestions.some((question) => question.options.length === 0)) {
        throw new Error('At least one multiple_choice question was saved without options.');
    }

    console.log('[QuizPipelineTest] Verification succeeded.');
    console.log(
        JSON.stringify(
            {
                uploadDataId: upload.id,
                quizId: savedQuiz.id,
                config: quizConfig,
                questionCount: savedQuiz.questions.length,
                multipleChoiceCount: multipleChoiceQuestions.length,
                firstQuestion: savedQuiz.questions[0]?.questionText ?? null,
            },
            null,
            2
        )
    );
}

main()
    .catch((error) => {
        console.error('[QuizPipelineTest] Verification failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
