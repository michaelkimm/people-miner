"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIL_FALSE_POSITIVE_PATTERNS = exports.TIL_REPO_PATTERNS = void 0;
exports.TIL_REPO_PATTERNS = [
    /^til$/i,
    /\btoday-?i-?learned\b/i,
    /^daily-?study$/i,
    /^learning-?journal$/i,
    /^dev-?notes$/i,
    /^what-?i-?learned$/i,
];
exports.TIL_FALSE_POSITIVE_PATTERNS = [
    /until/i,
    /utility|utilities/i,
    /title/i,
    /textile/i,
    /subtitle/i,
    /fertile/i,
    /reptile/i,
    /hostile/i,
];
//# sourceMappingURL=til-detection.constants.js.map