export type TargetRole = 'backend' | 'frontend' | 'mobile' | 'fullstack' | 'all';

export interface RoleConfig {
  languages: string[];
  excludeLanguages: string[];
  keywords: string[];
  excludeKeywords: string[];
}

export const TECH_STACK_CONFIG: Record<TargetRole, RoleConfig> = {
  backend: {
    languages: [
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
    ],
    excludeLanguages: [
      'Swift',
      'Objective-C',
      'Dart', // Flutter
      'CSS',
      'SCSS',
      'Sass',
      'Less',
      'HTML',
    ],
    keywords: [
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
      'graphql server',
      'sql',
      'nosql',
      'redis',
      'kafka',
      'rabbitmq',
      'data engineer',
      'sre',
      'platform',
    ],
    excludeKeywords: [
      // Mobile exclusions
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
      // Frontend exclusions
      'frontend developer',
      'frontend engineer',
      'front-end developer',
      'front-end engineer',
      'ui developer',
      'ui engineer',
      'react developer',
      'vue developer',
      'angular developer',
      'web designer',
      'css specialist',
    ],
  },

  frontend: {
    languages: ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'SCSS', 'Sass'],
    excludeLanguages: ['Swift', 'Objective-C', 'Dart'],
    keywords: [
      'frontend',
      'front-end',
      'web developer',
      'react',
      'vue',
      'angular',
      'svelte',
      'next.js',
      'nuxt',
      'ui engineer',
      'ux engineer',
      'web',
      'css',
      'tailwind',
      'webpack',
      'vite',
    ],
    excludeKeywords: [
      'ios',
      'android',
      'mobile',
      'flutter',
      'react native',
      'swift',
      'kotlin',
    ],
  },

  mobile: {
    languages: ['Swift', 'Kotlin', 'Dart', 'Objective-C', 'Java'],
    excludeLanguages: [],
    keywords: [
      'ios',
      'android',
      'mobile',
      'flutter',
      'react native',
      'swiftui',
      'uikit',
      'jetpack compose',
      'kotlin multiplatform',
      'kmp',
      'app developer',
    ],
    excludeKeywords: [],
  },

  fullstack: {
    // Union of backend + frontend languages
    languages: [
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
      'TypeScript',
      'JavaScript',
    ],
    excludeLanguages: ['Swift', 'Objective-C', 'Dart'],
    keywords: [
      'fullstack',
      'full-stack',
      'full stack',
      'backend',
      'frontend',
      'web developer',
    ],
    excludeKeywords: [
      'ios developer',
      'android developer',
      'mobile developer',
      'flutter',
    ],
  },

  all: {
    languages: [],
    excludeLanguages: [],
    keywords: [],
    excludeKeywords: [],
  },
};

// TypeScript/JavaScript special handling
// These languages can be either frontend or backend (Node.js)
// We need additional context (bio/keywords) to determine the role
export const AMBIGUOUS_LANGUAGES = ['TypeScript', 'JavaScript'];

// Kotlin special handling - can be Android or Backend (Ktor, Spring)
// Check for Android-specific keywords to determine
export const KOTLIN_ANDROID_KEYWORDS = [
  'android',
  'jetpack',
  'compose',
  'mobile',
  'app',
];

export const KOTLIN_BACKEND_KEYWORDS = [
  'ktor',
  'spring',
  'backend',
  'server',
  'api',
];

// Backend filter ratio configuration
export const BACKEND_FILTER_CONFIG = {
  minBackendLanguageRatio: 0.5, // At least 50% backend languages
};
