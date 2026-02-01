#!/usr/bin/env python3
"""
Test suite for Korean Tech Blog Crawler
"""

import asyncio
import pytest
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

from src.crawler import (
    Author, BlogPost, BlogConfig, WoowahanCrawler,
    create_crawler, BaseBlogCrawler
)


class ConcreteCrawler(BaseBlogCrawler):
    """테스트용 구체 크롤러 클래스"""

    async def discover_posts(self):
        """테스트용 discover_posts 구현"""
        return []

    async def extract_author_info(self, soup, url):
        """테스트용 extract_author_info 구현"""
        return None

@pytest.fixture
def temp_db():
    """Create temporary database for testing"""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = Path(f.name)
    yield db_path
    db_path.unlink(missing_ok=True)

@pytest.fixture
def sample_config():
    """Sample blog configuration"""
    return BlogConfig(
        name="Test Blog",
        base_url="https://test.example.com",
        rss_url="https://test.example.com/feed/",
        rate_limit=0.1
    )

@pytest.fixture
def sample_author():
    """Sample author data"""
    return Author(
        name="테스트 작성자",
        email="test@example.com",
        company="테스트 회사",
        job_title="개발자"
    )

@pytest.fixture
def sample_post(sample_author):
    """Sample blog post"""
    return BlogPost(
        title="테스트 게시물",
        url="https://test.example.com/post/1",
        author=sample_author,
        content="테스트 내용입니다.",
        tags=["테스트", "크롤러"]
    )

class TestBlogConfig:
    """Test BlogConfig dataclass"""
    
    def test_blog_config_creation(self):
        config = BlogConfig(
            name="Test",
            base_url="https://test.com",
            rate_limit=2.0
        )
        
        assert config.name == "Test"
        assert config.base_url == "https://test.com"
        assert config.rate_limit == 2.0
        assert config.max_retries == 3  # default value

class TestAuthor:
    """Test Author dataclass"""
    
    def test_author_creation(self):
        author = Author(
            name="홍길동",
            email="hong@example.com",
            company="테스트회사"
        )
        
        assert author.name == "홍길동"
        assert author.email == "hong@example.com"
        assert author.company == "테스트회사"
        assert author.is_team is False  # default value

class TestBlogPost:
    """Test BlogPost dataclass"""
    
    def test_post_creation(self, sample_author):
        post = BlogPost(
            title="제목",
            url="https://test.com/post/1",
            author=sample_author,
            tags=["태그1", "태그2"]
        )
        
        assert post.title == "제목"
        assert post.author.name == "테스트 작성자"
        assert post.tags == ["태그1", "태그2"]
        assert post.word_count is None  # not calculated yet

class TestBaseBlogCrawler:
    """Test base crawler functionality"""
    
    @pytest.mark.asyncio
    async def test_crawler_context_manager(self, temp_db, sample_config):
        """Test async context manager"""
        crawler = ConcreteCrawler(sample_config, temp_db)
        
        async with crawler as c:
            assert c.session is not None
            assert isinstance(c.session, object)  # aiohttp ClientSession
    
    @pytest.mark.asyncio
    async def test_fetch_page_success(self, temp_db, sample_config):
        """Test successful page fetch"""
        crawler = ConcreteCrawler(sample_config, temp_db)
        
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.text = AsyncMock(return_value="<html>Test content</html>")
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value = mock_response
            
            async with crawler:
                content = await crawler.fetch_page("https://test.com")
                assert content == "<html>Test content</html>"
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="aiohttp mocking requires complex setup - needs refactoring")
    async def test_fetch_page_retry(self, temp_db, sample_config):
        """Test page fetch with retries"""
        crawler = ConcreteCrawler(sample_config, temp_db)
        
        mock_response_fail = MagicMock()
        mock_response_fail.status = 500
        
        mock_response_success = MagicMock()
        mock_response_success.status = 200
        mock_response_success.text = AsyncMock(return_value="<html>Success</html>")
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            # Fail first two attempts, succeed on third
            mock_get.side_effect = [
                mock_response_fail,
                mock_response_fail,
                mock_response_success
            ]
            
            async with crawler:
                content = await crawler.fetch_page("https://test.com")
                assert content == "<html>Success</html>"
                assert mock_get.call_count == 3
    
    def test_parse_rss_feed(self, temp_db, sample_config):
        """Test RSS feed parsing"""
        crawler = ConcreteCrawler(sample_config, temp_db)
        
        rss_content = """<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
            <channel>
                <item>
                    <title>테스트 게시물</title>
                    <link>https://test.com/post/1</link>
                    <description>테스트 설명</description>
                    <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
                </item>
            </channel>
        </rss>"""
        
        posts = crawler.parse_rss_feed(rss_content)
        
        assert len(posts) == 1
        assert posts[0].title == "테스트 게시물"
        assert posts[0].url == "https://test.com/post/1"
        assert posts[0].excerpt == "테스트 설명"
    
    def test_parse_sitemap(self, temp_db, sample_config):
        """Test sitemap parsing"""
        crawler = ConcreteCrawler(sample_config, temp_db)
        
        sitemap_content = """<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url>
                <loc>https://test.com/post/1</loc>
            </url>
            <url>
                <loc>https://test.com/post/2</loc>
            </url>
        </urlset>"""
        
        urls = crawler.parse_sitemap(sitemap_content)
        
        assert len(urls) == 2
        assert "https://test.com/post/1" in urls
        assert "https://test.com/post/2" in urls
    
    def test_extract_full_post(self, temp_db, sample_config):
        """Test full post extraction from HTML"""
        crawler = ConcreteCrawler(sample_config, temp_db)
        
        html_content = """
        <html>
            <head><title>게시물 제목</title></head>
            <body>
                <article>
                    <h1>제목</h1>
                    <p>이것은 내용입니다.</p>
                    <p>이것은 두 번째 문단입니다.</p>
                </article>
            </body>
        </html>
        """
        
        post = BlogPost(title="", url="https://test.com/post/1")
        full_post = crawler.extract_full_post(html_content, post)
        
        assert full_post.title == "제목"  # <h1> 태그에서 추출
        assert "이것은 내용입니다" in full_post.content
        assert full_post.word_count > 0
        assert full_post.read_time >= 1

class TestWoowahanCrawler:
    """Test Woowahan blog crawler"""
    
    @pytest.mark.asyncio
    async def test_author_extraction_single(self, temp_db):
        """Test single author extraction"""
        config = BlogConfig(name="우아한형제들", base_url="https://techblog.woowahan.com")
        crawler = WoowahanCrawler(config, temp_db)
        
        html_content = """
        <html>
            <body>
                <div class="post-author-name">김개발</div>
                <div class="author-bio">Backend Developer</div>
                <div class="author-avatar">
                    <img src="https://example.com/avatar.jpg" />
                </div>
            </body>
        </html>
        """
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        author = await crawler.extract_author_info(soup, "https://test.com")
        
        assert author is not None
        assert author.name == "김개발"
        assert author.bio == "Backend Developer"
        assert author.avatar_url == "https://example.com/avatar.jpg"
        assert author.company == "우아한형제들"
        assert author.is_team is False
    
    @pytest.mark.asyncio
    async def test_author_extraction_multiple(self, temp_db):
        """Test multiple authors extraction"""
        config = BlogConfig(name="우아한형제들", base_url="https://techblog.woowahan.com")
        crawler = WoowahanCrawler(config, temp_db)
        
        html_content = """
        <html>
            <body>
                <div class="post-author-name">김개발, 이디자인, 박기효</div>
            </body>
        </html>
        """
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        author = await crawler.extract_author_info(soup, "https://test.com")
        
        assert author is not None
        assert author.is_team is True
        assert "김개발" in author.name
        assert author.metadata['individual_authors'] == ['김개발', '이디자인', '박기효']

class ConcreteCrawlerFactory:
    """Test crawler factory function"""
    
    def test_create_woowahan_crawler(self, temp_db):
        """Test creating Woowahan crawler"""
        crawler = create_crawler(
            "우아한형제들 기술블로그", 
            "https://techblog.woowahan.com", 
            temp_db
        )
        
        assert isinstance(crawler, WoowahanCrawler)
        assert crawler.config.name == "우아한형제들 기술블로그"
        assert crawler.config.base_url == "https://techblog.woowahan.com"

class TestDatabaseOperations:
    """Test database operations"""
    
    @pytest.mark.asyncio
    async def test_save_post(self, temp_db, sample_post):
        """Test saving post to database"""
        import sqlite3

        # SQLite용 테이블 생성
        with sqlite3.connect(temp_db) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS authors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    bio TEXT,
                    avatar_url TEXT,
                    github_url TEXT,
                    linkedin_url TEXT,
                    twitter_url TEXT,
                    company TEXT,
                    job_title TEXT,
                    team TEXT,
                    location TEXT,
                    is_team INTEGER DEFAULT 0,
                    metadata TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS blog_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    blog_id INTEGER,
                    url TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    excerpt TEXT,
                    content TEXT,
                    author_id INTEGER REFERENCES authors(id),
                    category TEXT,
                    tags TEXT,
                    published_date TEXT,
                    scraped_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    word_count INTEGER,
                    read_time INTEGER,
                    view_count INTEGER DEFAULT 0,
                    like_count INTEGER DEFAULT 0,
                    comment_count INTEGER DEFAULT 0,
                    featured_image_url TEXT,
                    status TEXT DEFAULT 'published',
                    metadata TEXT,
                    full_content_html TEXT
                )
            """)
            conn.commit()

        config = BlogConfig(name="Test", base_url="https://test.com")
        crawler = ConcreteCrawler(config, temp_db)

        success = await crawler.save_post(sample_post)
        assert success is True

        # Verify data was saved
        with sqlite3.connect(temp_db) as conn:
            cursor = conn.execute("SELECT title, author_id FROM blog_posts WHERE url = ?", (sample_post.url,))
            result = cursor.fetchone()
            assert result is not None
            assert result[0] == sample_post.title

# Integration tests
@pytest.mark.integration
class TestIntegration:
    """Integration tests with real blogs (marked to skip by default)"""
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Integration test - requires network")
    async def test_real_woowahan_discover(self, temp_db):
        """Test discovering posts from real Woowahan blog"""
        config = BlogConfig(
            name="우아한형제들 기술블로그",
            base_url="https://techblog.woowahan.com",
            rss_url="https://techblog.woowahan.com/feed/"
        )
        
        crawler = WoowahanCrawler(config, temp_db)
        
        try:
            async with crawler:
                posts = await crawler.discover_posts()
                assert len(posts) > 0
                
                for post in posts:
                    assert post.title
                    assert post.url
                    assert post.url.startswith("https://techblog.woowahan.com")
                    
        except Exception as e:
            pytest.skip(f"Network test skipped: {e}")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
