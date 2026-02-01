-- Candidates table
CREATE TABLE candidates (
    id VARCHAR(255) PRIMARY KEY,
    github_username VARCHAR(255) NOT NULL UNIQUE,
    github_id INTEGER,
    name VARCHAR(255),
    email VARCHAR(255),
    bio TEXT,
    company VARCHAR(255),
    location VARCHAR(255),
    blog VARCHAR(255),
    avatar_url VARCHAR(500),
    public_repos INTEGER DEFAULT 0,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    total_commits INTEGER DEFAULT 0,
    readability_score DOUBLE PRECISION,
    problem_solving_score DOUBLE PRECISION,
    clean_code_score DOUBLE PRECISION,
    solved_ac_score DOUBLE PRECISION,
    total_score DOUBLE PRECISION,
    has_til_repo BOOLEAN DEFAULT FALSE,
    til_repo_count INTEGER DEFAULT 0,
    longest_project_months INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scored_at TIMESTAMP,
    last_activity_at TIMESTAMP
);

CREATE INDEX idx_candidates_total_score ON candidates(total_score DESC);
CREATE INDEX idx_candidates_crawled_at ON candidates(crawled_at);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_last_activity_at ON candidates(last_activity_at DESC);

-- Candidate sources table
CREATE TABLE candidate_sources (
    id VARCHAR(255) PRIMARY KEY,
    candidate_id VARCHAR(255) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(500),
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, source_type, source_name)
);

-- Repositories table
CREATE TABLE repositories (
    id VARCHAR(255) PRIMARY KEY,
    candidate_id VARCHAR(255) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    description TEXT,
    language VARCHAR(100),
    star_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    url VARCHAR(500) NOT NULL,
    pushed_at TIMESTAMP,
    analyzed_at TIMESTAMP,
    UNIQUE(candidate_id, full_name)
);

-- Repository analyses table
CREATE TABLE repo_analyses (
    id VARCHAR(255) PRIMARY KEY,
    repository_id VARCHAR(255) NOT NULL UNIQUE REFERENCES repositories(id) ON DELETE CASCADE,
    has_tests BOOLEAN DEFAULT FALSE,
    test_framework VARCHAR(100),
    has_ci BOOLEAN DEFAULT FALSE,
    ci_platform VARCHAR(100),
    has_readme BOOLEAN DEFAULT FALSE,
    has_contributing BOOLEAN DEFAULT FALSE,
    has_license BOOLEAN DEFAULT FALSE,
    has_docs BOOLEAN DEFAULT FALSE,
    has_linter BOOLEAN DEFAULT FALSE,
    has_type_check BOOLEAN DEFAULT FALSE,
    has_dockerfile BOOLEAN DEFAULT FALSE,
    conventional_commit_ratio DOUBLE PRECISION,
    avg_commit_message_length INTEGER,
    total_commits INTEGER DEFAULT 0,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Solved AC profiles table
CREATE TABLE solved_ac_profiles (
    id VARCHAR(255) PRIMARY KEY,
    candidate_id VARCHAR(255) NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
    handle VARCHAR(255) NOT NULL,
    tier INTEGER NOT NULL,
    tier_name VARCHAR(50),
    rating INTEGER NOT NULL,
    solved_count INTEGER NOT NULL,
    vote_count INTEGER DEFAULT 0,
    class_level INTEGER DEFAULT 0,
    class_decoration VARCHAR(50),
    max_streak INTEGER DEFAULT 0,
    rank INTEGER,
    tag_stats JSONB,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_solved_ac_profiles_tier ON solved_ac_profiles(tier DESC);
CREATE INDEX idx_solved_ac_profiles_rating ON solved_ac_profiles(rating DESC);

-- OSS contributions table
CREATE TABLE oss_contributions (
    id VARCHAR(255) PRIMARY KEY,
    candidate_id VARCHAR(255) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    external_repo VARCHAR(500) NOT NULL,
    pr_title VARCHAR(500) NOT NULL,
    pr_url VARCHAR(500) NOT NULL UNIQUE,
    pr_number INTEGER NOT NULL,
    merged_at TIMESTAMP,
    state VARCHAR(50),
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    is_significant BOOLEAN DEFAULT FALSE,
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oss_contributions_candidate_id ON oss_contributions(candidate_id);

-- Candidate feedbacks table
CREATE TABLE candidate_feedbacks (
    id VARCHAR(255) PRIMARY KEY,
    candidate_id VARCHAR(255) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    reason VARCHAR(50),
    notes TEXT,
    snapshot JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidate_feedbacks_action ON candidate_feedbacks(action);
CREATE INDEX idx_candidate_feedbacks_reason ON candidate_feedbacks(reason);
CREATE INDEX idx_candidate_feedbacks_candidate_id ON candidate_feedbacks(candidate_id);
CREATE INDEX idx_candidate_feedbacks_created_at ON candidate_feedbacks(created_at);

-- Rejection rules table
CREATE TABLE rejection_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    confidence DOUBLE PRECISION DEFAULT 0,
    hit_count INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    auto_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rejection_rules_enabled ON rejection_rules(enabled);
CREATE INDEX idx_rejection_rules_confidence ON rejection_rules(confidence DESC);

-- Crawl sources table
CREATE TABLE crawl_sources (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    config JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    last_crawled TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crawl jobs table
CREATE TABLE crawl_jobs (
    id VARCHAR(255) PRIMARY KEY,
    source_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PENDING',
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    candidates_found INTEGER DEFAULT 0,
    candidates_new INTEGER DEFAULT 0,
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX idx_crawl_jobs_created_at ON crawl_jobs(created_at);
