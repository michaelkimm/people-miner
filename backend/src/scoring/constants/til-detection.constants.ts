/**
 * TIL (Today I Learned) 레포 탐지 패턴
 * 
 * 단어 경계(\b)를 사용하여 false positive 방지
 * 예: "TIL" → match, "until" → no match
 */
export const TIL_REPO_PATTERNS = [
  /^til$/i,                    // til, TIL (정확히 일치)
  /\btoday-?i-?learned\b/i,    // today-i-learned, todayilearned
  /^daily-?study$/i,           // daily-study
  /^learning-?journal$/i,      // learning-journal
  /^dev-?notes$/i,             // dev-notes
  /^what-?i-?learned$/i,       // what-i-learned
];

/**
 * False positive 방지 패턴
 * 
 * 이 패턴에 매칭되면 TIL 레포가 아님
 * 예: "until", "utility", "title" 등
 */
export const TIL_FALSE_POSITIVE_PATTERNS = [
  /until/i,
  /utility|utilities/i,
  /title/i,
  /textile/i,
  /subtitle/i,
  /fertile/i,
  /reptile/i,
  /hostile/i,
];
