"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const BACKEND_LANGUAGES = [
    'Java',
    'Go',
    'Python',
    'Rust',
    'C#',
    'Ruby',
    'PHP',
    'Scala',
    'Elixir',
    'C',
    'C++',
    'Clojure',
    'Haskell',
    'Erlang',
];
const AMBIGUOUS_LANGUAGES = ['TypeScript', 'JavaScript', 'Kotlin'];
const MOBILE_ONLY_LANGUAGES = ['Swift', 'Objective-C', 'Dart'];
const BACKEND_KEYWORDS = [
    'backend',
    'server',
    'api',
    'devops',
    'database',
    'microservice',
    'infrastructure',
    'cloud',
    'aws',
    'gcp',
    'azure',
    'kubernetes',
    'docker',
    'spring',
    'django',
    'flask',
    'fastapi',
    'nestjs',
    'express',
    'grpc',
    'sql',
    'nosql',
    'redis',
    'kafka',
    'rabbitmq',
    'data engineer',
    'sre',
    'platform',
    'ktor',
];
const MOBILE_KEYWORDS = [
    'ios developer',
    'ios engineer',
    'android developer',
    'android engineer',
    'mobile developer',
    'mobile engineer',
    'flutter developer',
    'react native developer',
    'swiftui',
    'uikit',
    'jetpack compose',
];
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        console.log('Starting cleanup of non-backend candidates...\n');
        const candidates = await prisma.candidate.findMany({
            include: {
                repositories: true,
            },
        });
        console.log(`Total candidates in database: ${candidates.length}`);
        const toDelete = [];
        const toKeep = [];
        for (const candidate of candidates) {
            const languages = candidate.repositories
                .map((r) => r.language)
                .filter((l) => l !== null);
            const uniqueLanguages = [...new Set(languages)];
            const textContext = [
                candidate.bio || '',
                candidate.company || '',
                ...candidate.repositories.map((r) => r.name || ''),
                ...candidate.repositories.map((r) => r.description || ''),
            ]
                .join(' ')
                .toLowerCase();
            const hasMobileKeyword = MOBILE_KEYWORDS.some((kw) => textContext.includes(kw.toLowerCase()));
            if (hasMobileKeyword) {
                toDelete.push(candidate.id);
                console.log(`[DELETE] ${candidate.githubUsername}: mobile keyword detected`);
                continue;
            }
            const hasOnlyMobileLanguages = uniqueLanguages.length > 0 &&
                uniqueLanguages.every((lang) => MOBILE_ONLY_LANGUAGES.map((l) => l.toLowerCase()).includes(lang.toLowerCase()) &&
                    !BACKEND_LANGUAGES.map((l) => l.toLowerCase()).includes(lang.toLowerCase()));
            if (hasOnlyMobileLanguages) {
                toDelete.push(candidate.id);
                console.log(`[DELETE] ${candidate.githubUsername}: only mobile languages (${uniqueLanguages.join(', ')})`);
                continue;
            }
            const hasBackendLanguage = uniqueLanguages.some((lang) => BACKEND_LANGUAGES.map((l) => l.toLowerCase()).includes(lang.toLowerCase()));
            if (hasBackendLanguage) {
                toKeep.push(candidate.id);
                continue;
            }
            const hasAmbiguousLanguage = uniqueLanguages.some((lang) => AMBIGUOUS_LANGUAGES.map((l) => l.toLowerCase()).includes(lang.toLowerCase()));
            if (hasAmbiguousLanguage) {
                const hasBackendKeyword = BACKEND_KEYWORDS.some((kw) => textContext.includes(kw.toLowerCase()));
                if (hasBackendKeyword) {
                    toKeep.push(candidate.id);
                    continue;
                }
            }
            if (uniqueLanguages.length === 0) {
                toKeep.push(candidate.id);
                continue;
            }
            toDelete.push(candidate.id);
            console.log(`[DELETE] ${candidate.githubUsername}: no backend indicators (languages: ${uniqueLanguages.join(', ')})`);
        }
        console.log(`\n--- Summary ---`);
        console.log(`To keep: ${toKeep.length}`);
        console.log(`To delete: ${toDelete.length}`);
        if (toDelete.length === 0) {
            console.log('\nNo candidates to delete. Done!');
            return;
        }
        console.log('\nDeleting candidates...');
        const deleteResult = await prisma.candidate.deleteMany({
            where: {
                id: { in: toDelete },
            },
        });
        console.log(`\nDeleted ${deleteResult.count} candidates.`);
        const remainingCount = await prisma.candidate.count();
        console.log(`Remaining candidates: ${remainingCount}`);
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=cleanup-non-backend.js.map