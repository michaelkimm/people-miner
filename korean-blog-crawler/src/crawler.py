#!/usr/bin/env python3
"""
Korean Tech Blog Crawler
A robust, multi-threaded crawler for Korean tech blogs with author extraction
"""

import asyncio
import aiohttp
import feedparser
import hashlib
import json
import logging
import re
import sqlite3
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup, Tag
from dataclasses_json import dataclass_json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass_json
@dataclass
class Author:
    name: str
    email: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    team: Optional[str] = None
    is_team: bool = False
    metadata: Optional[Dict[str, Any]] = None

@dataclass_json
@dataclass
class BlogPost:
    title: str
    url: str
    excerpt: Optional[str] = None
    content: Optional[str] = None
    author: Optional[Author] = None
    category: Optional[str] = None
    tags: List[str] = None
    published_date: Optional[datetime] = None
    word_count: Optional[int] = None
    read_time: Optional[int] = None
    featured_image_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass_json
@dataclass
class BlogConfig:
    name: str
    base_url: str
    rss_url: Optional[str] = None
    sitemap_url: Optional[str] = None
    description: Optional[str] = None
    rate_limit: float = 1.0  # seconds between requests
    timeout: int = 30
    max_retries: int = 3
    selectors: Dict[str, str] = None  # CSS selectors for author info

class BaseBlogCrawler(ABC):
    """Abstract base class for blog crawlers"""
    
    def __init__(self, config: BlogConfig, db_path: Path):
        self.config = config
        self.db_path = db_path
        self.session: Optional[aiohttp.ClientSession] = None
        self._setup_database()
    
    def _setup_database(self):
        """Initialize SQLite database with schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Enable foreign keys
            conn.execute("PRAGMA foreign_keys = ON")
            conn.commit()
    
    async def __aenter__(self):
        """Async context manager entry"""
        connector = aiohttp.TCPConnector(
            limit=10,
            limit_per_host=2,
            ttl_dns_cache=300,
            use_dns_cache=True,
        )
        timeout = aiohttp.ClientTimeout(total=self.config.timeout)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; KoreanTechBlogCrawler/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    @abstractmethod
    async def discover_posts(self) -> List[BlogPost]:
        """Discover blog posts from RSS, sitemap, or crawling"""
        pass
    
    @abstractmethod
    async def extract_author_info(self, soup: BeautifulSoup, post_url: str) -> Optional[Author]:
        """Extract author information from blog post HTML"""
        pass
    
    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch webpage content with retries"""
        for attempt in range(self.config.max_retries):
            try:
                await asyncio.sleep(self.config.rate_limit)
                
                async with self.session.get(url) as response:
                    if response.status == 200:
                        content = await response.text()
                        logger.debug(f"Successfully fetched: {url}")
                        return content
                    else:
                        logger.warning(f"HTTP {response.status} for {url}")
                        
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt == self.config.max_retries - 1:
                    raise
                    
        return None
    
    def parse_rss_feed(self, rss_content: str) -> List[BlogPost]:
        """Parse RSS feed content"""
        try:
            feed = feedparser.parse(rss_content)
            posts = []
            
            for entry in feed.entries:
                post = BlogPost(
                    title=entry.get('title', ''),
                    url=entry.get('link', ''),
                    excerpt=entry.get('summary', ''),
                    published_date=self._parse_date(entry.get('published')),
                    tags=[tag.term for tag in entry.get('tags', [])]
                )
                posts.append(post)
                
            return posts
            
        except Exception as e:
            logger.error(f"RSS parsing failed: {e}")
            return []
    
    def parse_sitemap(self, sitemap_content: str) -> List[str]:
        """Parse sitemap XML to extract URLs"""
        try:
            root = ET.fromstring(sitemap_content)
            urls = []
            
            namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            for url in root.findall('.//ns:url', namespace):
                loc = url.find('ns:loc', namespace)
                if loc is not None and loc.text:
                    urls.append(loc.text)
                    
            return urls
            
        except Exception as e:
            logger.error(f"Sitemap parsing failed: {e}")
            return []
    
    def extract_full_post(self, html_content: str, post: BlogPost) -> BlogPost:
        """Extract full post content and author from HTML"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract title if missing
        if not post.title:
            title_tag = soup.find('h1') or soup.find('title')
            if title_tag:
                post.title = title_tag.get_text(strip=True)
        
        # Extract content
        content_selectors = [
            'article',
            '[class*="content"]',
            '[class*="post-content"]',
            '[class*="entry-content"]',
            'main',
            '#content',
            '.content'
        ]
        
        content = None
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                content = element.get_text(strip=True)
                break
                
        post.content = content or soup.get_text(strip=True)
        post.word_count = len(post.content.split()) if post.content else 0
        post.read_time = max(1, post.word_count // 200) if post.word_count else 0  # 200 words per minute
        
        # Extract author information
        post.author = self.extract_author_info(soup, post.url)
        
        # Extract featured image
        img_tag = soup.find('meta', property='og:image') or soup.find('img', class_=re.compile('featured|main|hero'))
        if img_tag:
            post.featured_image_url = img_tag.get('content') or img_tag.get('src')
        
        return post
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse various date formats"""
        if not date_str:
            return None
            
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%dT%H:%M:%SZ',
            '%a, %d %b %Y %H:%M:%S %z',
            '%a, %d %b %Y %H:%M:%S %Z'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
                
        logger.warning(f"Could not parse date: {date_str}")
        return None
    
    async def save_post(self, post: BlogPost) -> bool:
        """Save post to database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Save author first
                author_id = None
                if post.author:
                    cursor.execute("""
                        INSERT OR REPLACE INTO authors 
                        (name, email, bio, avatar_url, github_url, company, job_title, team, is_team, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        post.author.name,
                        post.author.email,
                        post.author.bio,
                        post.author.avatar_url,
                        post.author.github_url,
                        post.author.company,
                        post.author.job_title,
                        post.author.team,
                        post.author.is_team,
                        json.dumps(post.author.metadata) if post.author.metadata else None
                    ))
                    author_id = cursor.lastrowid
                
                # Save post
                cursor.execute("""
                    INSERT OR REPLACE INTO blog_posts
                    (url, title, excerpt, content, author_id, category, tags, published_date, 
                     word_count, read_time, featured_image_url, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    post.url,
                    post.title,
                    post.excerpt,
                    post.content,
                    author_id,
                    post.category,
                    json.dumps(post.tags) if post.tags else None,
                    post.published_date,
                    post.word_count,
                    post.read_time,
                    post.featured_image_url,
                    json.dumps(post.metadata) if post.metadata else None
                ))
                
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Failed to save post {post.url}: {e}")
            return False
    
    async def crawl(self) -> Dict[str, int]:
        """Main crawling method"""
        logger.info(f"Starting crawl for {self.config.name}")
        
        stats = {
            'posts_found': 0,
            'posts_new': 0,
            'posts_updated': 0,
            'authors_found': 0,
            'errors': 0
        }
        
        try:
            # Discover posts
            posts = await self.discover_posts()
            stats['posts_found'] = len(posts)
            
            # Process each post
            for i, post in enumerate(posts):
                try:
                    logger.info(f"Processing post {i+1}/{len(posts)}: {post.title[:50]}...")
                    
                    # Fetch full content
                    html_content = await self.fetch_page(post.url)
                    if html_content:
                        full_post = self.extract_full_post(html_content, post)
                        
                        # Save to database
                        if await self.save_post(full_post):
                            if full_post.author:
                                stats['authors_found'] += 1
                            stats['posts_new'] += 1
                        
                    await asyncio.sleep(self.config.rate_limit)
                    
                except Exception as e:
                    logger.error(f"Error processing post {post.url}: {e}")
                    stats['errors'] += 1
            
        except Exception as e:
            logger.error(f"Crawling failed for {self.config.name}: {e}")
            stats['errors'] += 1
        
        return stats


class WoowahanCrawler(BaseBlogCrawler):
    """Crawler for Woowahan Tech Blog"""
    
    async def discover_posts(self) -> List[BlogPost]:
        """Discover posts from RSS feed"""
        if not self.config.rss_url:
            return []
            
        rss_content = await self.fetch_page(self.config.rss_url)
        return self.parse_rss_feed(rss_content) if rss_content else []
    
    async def extract_author_info(self, soup: BeautifulSoup, post_url: str) -> Optional[Author]:
        """Extract author info from Woowahan blog"""
        # Woowahan specific selectors based on analysis
        author_selectors = [
            '.post-author-name',
            '.author-name',
            '[class*="author"]',
            '.post-meta .author'
        ]
        
        name = None
        for selector in author_selectors:
            element = soup.select_one(selector)
            if element:
                name = element.get_text(strip=True)
                break
        
        # Try to extract multiple authors (comma-separated)
        if name:
            authors = [a.strip() for a in name.split(',')]
            if len(authors) > 1:
                return Author(
                    name=name,
                    company='우아한형제들',
                    is_team=True,
                    metadata={'individual_authors': authors}
                )
        
        # Extract bio if available
        bio_element = soup.select_one('.author-bio, .author-description')
        bio = bio_element.get_text(strip=True) if bio_element else None
        
        # Extract avatar
        avatar_element = soup.select_one('.author-avatar img, .author-photo img')
        avatar_url = avatar_element.get('src') if avatar_element else None
        
        return Author(
            name=name or 'Unknown',
            bio=bio,
            avatar_url=avatar_url,
            company='우아한형제들'
        )


class KakaoTechCrawler(BaseBlogCrawler):
    """Crawler for Kakao Tech Blog"""
    
    async def discover_posts(self) -> List[BlogPost]:
        """Discover posts from RSS feed"""
        if not self.config.rss_url:
            return []
            
        rss_content = await self.fetch_page(self.config.rss_url)
        return self.parse_rss_feed(rss_content) if rss_content else []
    
    async def extract_author_info(self, soup: BeautifulSoup, post_url: str) -> Optional[Author]:
        """Extract author info from Kakao Tech blog"""
        # Kakao Tech specific selectors
        author_element = soup.select_one('.author-name, .writer-name, [class*="author"]')
        name = author_element.get_text(strip=True) if author_element else None
        
        # Extract job title and company
        title_element = soup.select_one('.author-title, .author-position')
        job_title = title_element.get_text(strip=True) if title_element else None
        
        return Author(
            name=name or 'Unknown',
            job_title=job_title,
            company='카카오'
        )


class TossTechCrawler(BaseBlogCrawler):
    """Crawler for Toss Tech Blog"""
    
    async def discover_posts(self) -> List[BlogPost]:
        """Discover posts from RSS feed"""
        if not self.config.rss_url:
            return []
            
        rss_content = await self.fetch_page(self.config.rss_url)
        return self.parse_rss_feed(rss_content) if rss_content else []
    
    async def extract_author_info(self, soup: BeautifulSoup, post_url: str) -> Optional[Author]:
        """Extract author info from Toss Tech blog"""
        # Toss Tech specific selectors based on CSS analysis
        author_element = soup.select_one('.css-14exnec, [class*="author"], .author')
        name = author_element.get_text(strip=True) if author_element else None
        
        # Look for GitHub links
        github_element = soup.select_one('a[href*="github.com"]')
        github_url = github_element.get('href') if github_element else None
        
        return Author(
            name=name or 'Unknown',
            github_url=github_url,
            company='토스'
        )


# Factory function to create appropriate crawler
def create_crawler(blog_name: str, base_url: str, db_path: Path) -> BaseBlogCrawler:
    """Create appropriate crawler based on blog name"""
    
    crawler_map = {
        '우아한형제들 기술블로그': WoowahanCrawler,
        '카카오테크 기술블로그': KakaoTechCrawler,
        '토스 기술 블로그': TossTechCrawler,
    }
    
    crawler_class = crawler_map.get(blog_name, BaseBlogCrawler)
    
    config = BlogConfig(
        name=blog_name,
        base_url=base_url,
        rss_url=f"{base_url.rstrip('/')}/feed/",
        sitemap_url=f"{base_url.rstrip('/')}/sitemap.xml",
        rate_limit=1.0
    )
    
    return crawler_class(config, db_path)


# Main execution
async def main():
    """Main execution function"""
    db_path = Path("korean_blog_crawler.db")
    
    # Blog configurations
    blogs = [
        ('우아한형제들 기술블로그', 'https://techblog.woowahan.com'),
        ('카카오테크 기술블로그', 'https://tech.kakao.com'),
        ('토스 기술 블로그', 'https://toss.tech'),
    ]
    
    total_stats = {
        'posts_found': 0,
        'posts_new': 0,
        'authors_found': 0,
        'errors': 0
    }
    
    for blog_name, base_url in blogs:
        logger.info(f"Starting crawler for {blog_name}")
        
        try:
            crawler = create_crawler(blog_name, base_url, db_path)
            async with crawler:
                stats = await crawler.crawl()
                
                for key in total_stats:
                    total_stats[key] += stats.get(key, 0)
                    
                logger.info(f"Completed {blog_name}: {stats}")
                
        except Exception as e:
            logger.error(f"Failed to crawl {blog_name}: {e}")
            total_stats['errors'] += 1
    
    logger.info(f"Total crawling results: {total_stats}")


if __name__ == "__main__":
    asyncio.run(main())
