-- Korean Tech Blog Crawler Database Schema
-- Designed for storing blog posts, authors, and relationships

-- Core blog information
CREATE TABLE blogs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    url VARCHAR(500) NOT NULL UNIQUE,
    rss_url VARCHAR(500),
    sitemap_url VARCHAR(500),
    description TEXT,
    language VARCHAR(10) DEFAULT 'ko',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Author information with rich metadata
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    bio TEXT,
    avatar_url VARCHAR(500),
    github_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    company VARCHAR(100),
    job_title VARCHAR(200),
    team VARCHAR(100),
    location VARCHAR(100),
    is_team BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog posts with comprehensive metadata
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
    url VARCHAR(1000) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL,
    category VARCHAR(100),
    tags TEXT[],
    published_date TIMESTAMP,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    word_count INTEGER,
    read_time INTEGER, -- in minutes
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    featured_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'published', -- published, draft, archived
    metadata JSONB, -- raw HTML, CSS selectors used, etc.
    full_content_html TEXT
);

-- Category system for better organization
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    priority INTEGER DEFAULT 0,
    color VARCHAR(7), -- hex color for UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship between posts and categories
CREATE TABLE post_categories (
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);

-- Track crawling statistics and health
CREATE TABLE crawl_stats (
    id SERIAL PRIMARY KEY,
    blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
    crawl_date DATE DEFAULT CURRENT_DATE,
    posts_found INTEGER DEFAULT 0,
    posts_new INTEGER DEFAULT 0,
    posts_updated INTEGER DEFAULT 0,
    authors_found INTEGER DEFAULT 0,
    authors_new INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    crawl_duration_seconds INTEGER,
    success_rate DECIMAL(5,2), -- percentage
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Error logging for debugging
CREATE TABLE crawl_errors (
    id SERIAL PRIMARY KEY,
    blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
    post_url VARCHAR(1000),
    error_type VARCHAR(100), -- timeout, 404, parse_error, etc.
    error_message TEXT,
    stack_trace TEXT,
    retry_count INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_posts_author ON blog_posts(author_id);
CREATE INDEX idx_posts_blog ON blog_posts(blog_id);
CREATE INDEX idx_posts_published ON blog_posts(published_date DESC);
CREATE INDEX idx_posts_category ON blog_posts(category);
CREATE INDEX idx_posts_title_search ON blog_posts USING gin(to_tsvector('korean', title));
CREATE INDEX idx_posts_content_search ON blog_posts USING gin(to_tsvector('korean', content));

CREATE INDEX idx_authors_name ON authors(name);
CREATE INDEX idx_authors_company ON authors(company);
CREATE INDEX idx_authors_team ON authors(team);

CREATE INDEX idx_crawl_stats_date ON crawl_stats(crawl_date DESC);
CREATE INDEX idx_crawl_errors_blog ON crawl_errors(blog_id);

-- Insert initial blog data
INSERT INTO blogs (name, url, rss_url, sitemap_url, description) VALUES
('우아한형제들 기술블로그', 'https://techblog.woowahan.com', 'https://techblog.woowahan.com/feed/', 'https://techblog.woowahan.com/sitemap.xml', '우아한형제들 기술 블로그'),
('카카오테크 기술블로그', 'https://tech.kakao.com', 'https://tech.kakao.com/feed/', 'https://tech.kakao.com/sitemap.xml', '카카오 기술 블로그'),
('토스 기술 블로그', 'https://toss.tech', 'https://toss.tech/feed', 'https://toss.tech/sitemap.xml', '토스 기술 블로그'),
('네이버 D2', 'https://d2.naver.com', 'https://d2.naver.com/feed', 'https://d2.naver.com/sitemap.xml', '네이버 D2 기술 블로그'),
('커널스크립', 'https://corp.coupang.com', 'https://corp.coupang.com/feed', 'https://corp.coupang.com/sitemap.xml', '쿠팡 기술 블로그');

-- Insert initial categories
INSERT INTO categories (name, slug, priority, color) VALUES
('AI/ML', 'ai-ml', 10, '#FF6B6B'),
('클라우드/인프라', 'cloud-infra', 20, '#4ECDC4'),
('보안', 'security', 30, '#45B7D1'),
('프론트엔드', 'frontend', 40, '#96CEB4'),
('백엔드', 'backend', 50, '#FFEAA7'),
('데이터', 'data', 60, '#DDA0DD'),
('DevOps', 'devops', 70, '#98D8C8'),
('모바일', 'mobile', 80, '#F7DC6F'),
('설계/아키텍처', 'architecture', 90, '#BB8FCE'),
('기타', 'etc', 100, '#95A5A6');
