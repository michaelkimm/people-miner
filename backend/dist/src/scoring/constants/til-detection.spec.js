"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const til_detection_constants_1 = require("./til-detection.constants");
describe('TIL Detection Patterns', () => {
    describe('TIL_REPO_PATTERNS', () => {
        it('should match exact TIL repo names', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('TIL'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('til'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('TiL'))).toBe(true);
        });
        it('should match today-i-learned variations', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('today-i-learned'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('todayilearned'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('Today-I-Learned'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('TodayILearned'))).toBe(true);
        });
        it('should match daily-study variations', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('daily-study'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('dailystudy'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('Daily-Study'))).toBe(true);
        });
        it('should match learning-journal variations', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('learning-journal'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('learningjournal'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('Learning-Journal'))).toBe(true);
        });
        it('should match dev-notes variations', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('dev-notes'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('devnotes'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('Dev-Notes'))).toBe(true);
        });
        it('should match what-i-learned variations', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('what-i-learned'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('whatilearned'))).toBe(true);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('What-I-Learned'))).toBe(true);
        });
        it('should not match false positives', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('until'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('utility'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('title'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('textile'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('subtitle'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('fertile'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('reptile'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('hostile'))).toBe(false);
        });
        it('should not match TIL as part of longer words', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('utilities'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('ventilation'))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('distillery'))).toBe(false);
        });
        it('should handle empty and null strings', () => {
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test(''))).toBe(false);
            expect(til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test('   '))).toBe(false);
        });
    });
    describe('TIL_FALSE_POSITIVE_PATTERNS', () => {
        it('should match until variations', () => {
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('until'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('Until'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('UNTIL'))).toBe(true);
        });
        it('should match utility variations', () => {
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('utility'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('utilities'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('Utility'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('Utilities'))).toBe(true);
        });
        it('should match title variations', () => {
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('title'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('Title'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('TITLE'))).toBe(true);
        });
        it('should match textile variations', () => {
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('textile'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('Textile'))).toBe(true);
        });
        it('should match subtitle variations', () => {
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('subtitle'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('Subtitle'))).toBe(true);
        });
        it('should match other false positives', () => {
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('fertile'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('reptile'))).toBe(true);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('hostile'))).toBe(true);
        });
        it('should not match legitimate TIL repo names', () => {
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('TIL'))).toBe(false);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('today-i-learned'))).toBe(false);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('daily-study'))).toBe(false);
            expect(til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test('learning-journal'))).toBe(false);
        });
    });
    describe('Pattern Integration', () => {
        const isTilRepo = (name) => {
            const matchesTilPattern = til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test(name));
            const matchesFalsePositive = til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test(name));
            return matchesTilPattern && !matchesFalsePositive;
        };
        it('should correctly identify TIL repos', () => {
            expect(isTilRepo('TIL')).toBe(true);
            expect(isTilRepo('til')).toBe(true);
            expect(isTilRepo('today-i-learned')).toBe(true);
            expect(isTilRepo('daily-study')).toBe(true);
            expect(isTilRepo('learning-journal')).toBe(true);
            expect(isTilRepo('dev-notes')).toBe(true);
            expect(isTilRepo('what-i-learned')).toBe(true);
        });
        it('should correctly reject false positives', () => {
            expect(isTilRepo('until')).toBe(false);
            expect(isTilRepo('utility')).toBe(false);
            expect(isTilRepo('utilities')).toBe(false);
            expect(isTilRepo('title')).toBe(false);
            expect(isTilRepo('subtitle')).toBe(false);
            expect(isTilRepo('textile')).toBe(false);
            expect(isTilRepo('fertile')).toBe(false);
            expect(isTilRepo('reptile')).toBe(false);
            expect(isTilRepo('hostile')).toBe(false);
        });
        it('should handle edge cases', () => {
            expect(isTilRepo('')).toBe(false);
            expect(isTilRepo('   ')).toBe(false);
            expect(isTilRepo('random-repo')).toBe(false);
            expect(isTilRepo('my-project')).toBe(false);
        });
    });
});
//# sourceMappingURL=til-detection.spec.js.map