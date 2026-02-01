"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolvedAcStrategy = void 0;
const common_1 = require("@nestjs/common");
const ADVANCED_ALGORITHM_TAGS = new Set([
    'segment_tree', 'lazyprop', 'hld', 'link_cut_tree',
    'dp_tree', 'dp_bitfield', 'dp_deque', 'dp_connection_profile',
    'flow', 'mcmf', 'bipartite_matching', 'general_matching',
    'sqrt_decomposition', 'mo', 'centroid', 'centroid_decomposition',
    'fft', 'ntt', 'convex_hull_trick', 'aliens',
    'suffix_array', 'aho_corasick', 'manacher', 'z',
    'scc', 'bcc', '2_sat', 'offline_queries',
    'persistent_ds', 'merge_sort_tree', 'rope',
]);
const INTERMEDIATE_ALGORITHM_TAGS = new Set([
    'dp', 'greedy', 'graph_traversal', 'shortest_path', 'dijkstra',
    'bfs', 'dfs', 'binary_search', 'parametric_search', 'two_pointer',
    'prefix_sum', 'stack', 'queue', 'priority_queue', 'deque',
    'trees', 'disjoint_set', 'topological_sorting', 'mst',
    'backtracking', 'divide_and_conquer', 'game_theory', 'sprague_grundy',
    'geometry', 'convex_hull', 'line_intersection', 'sweeping',
    'hash', 'trie', 'kmp', 'rabin_karp',
]);
const TIER_THRESHOLDS = {
    RUBY_I: 26,
    DIAMOND_V: 21,
    PLATINUM_V: 16,
    GOLD_V: 11,
    SILVER_V: 6,
    BRONZE_V: 1,
};
let SolvedAcStrategy = class SolvedAcStrategy {
    constructor() {
        this.name = 'solvedAc';
        this.description = 'Scores based on solved.ac tier and algorithm depth';
        this.defaultWeight = 0.35;
    }
    isApplicable(candidate) {
        return !!candidate.solvedAcProfile;
    }
    async calculate(candidate) {
        const profile = candidate.solvedAcProfile;
        if (!profile) {
            return { value: 0, breakdown: { noProfile: 1 } };
        }
        const breakdown = {};
        breakdown.tier = this.scoreTier(profile.tier);
        breakdown.algorithmDepth = this.scoreAlgorithmDepth(profile.tagStats);
        breakdown.consistency = this.scoreConsistency(profile.maxStreak, profile.solvedCount);
        breakdown.classLevel = this.scoreClass(profile.classLevel, profile.classDecoration);
        const value = Math.round(breakdown.tier * 0.40 +
            breakdown.algorithmDepth * 0.35 +
            breakdown.consistency * 0.15 +
            breakdown.classLevel * 0.10);
        return {
            value: Math.min(value, 100),
            breakdown,
            metadata: {
                handle: profile.handle,
                tierName: profile.tierName,
                solvedCount: profile.solvedCount,
                rating: profile.rating,
            },
        };
    }
    scoreTier(tier) {
        if (tier >= TIER_THRESHOLDS.RUBY_I)
            return 100;
        if (tier >= TIER_THRESHOLDS.DIAMOND_V)
            return 95;
        if (tier >= TIER_THRESHOLDS.PLATINUM_V)
            return 85;
        if (tier >= TIER_THRESHOLDS.GOLD_V)
            return 70;
        if (tier >= TIER_THRESHOLDS.SILVER_V)
            return 55;
        if (tier >= TIER_THRESHOLDS.BRONZE_V)
            return 40;
        return 20;
    }
    scoreAlgorithmDepth(tagStats) {
        if (!tagStats)
            return 40;
        let advancedSolved = 0;
        let intermediateSolved = 0;
        for (const [tag, count] of Object.entries(tagStats)) {
            if (ADVANCED_ALGORITHM_TAGS.has(tag)) {
                advancedSolved += count;
            }
            else if (INTERMEDIATE_ALGORITHM_TAGS.has(tag)) {
                intermediateSolved += count;
            }
        }
        let score = 40;
        if (advancedSolved >= 100)
            score += 40;
        else if (advancedSolved >= 50)
            score += 30;
        else if (advancedSolved >= 20)
            score += 20;
        else if (advancedSolved >= 10)
            score += 10;
        if (intermediateSolved >= 200)
            score += 20;
        else if (intermediateSolved >= 100)
            score += 15;
        else if (intermediateSolved >= 50)
            score += 10;
        else if (intermediateSolved >= 20)
            score += 5;
        return Math.min(score, 100);
    }
    scoreConsistency(maxStreak, solvedCount) {
        let score = 40;
        if (maxStreak >= 365)
            score += 30;
        else if (maxStreak >= 180)
            score += 25;
        else if (maxStreak >= 90)
            score += 20;
        else if (maxStreak >= 30)
            score += 15;
        else if (maxStreak >= 7)
            score += 5;
        if (solvedCount >= 2000)
            score += 30;
        else if (solvedCount >= 1000)
            score += 25;
        else if (solvedCount >= 500)
            score += 20;
        else if (solvedCount >= 200)
            score += 15;
        else if (solvedCount >= 100)
            score += 10;
        return Math.min(score, 100);
    }
    scoreClass(classLevel, classDecoration) {
        let score = classLevel * 10;
        if (classDecoration === 'gold')
            score += 10;
        else if (classDecoration === 'silver')
            score += 5;
        return Math.min(score, 100);
    }
};
exports.SolvedAcStrategy = SolvedAcStrategy;
exports.SolvedAcStrategy = SolvedAcStrategy = __decorate([
    (0, common_1.Injectable)()
], SolvedAcStrategy);
//# sourceMappingURL=solved-ac.strategy.js.map