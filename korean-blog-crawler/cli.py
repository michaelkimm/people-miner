#!/usr/bin/env python3
"""
Korean Tech Blog Crawler CLI
JSON output wrapper for NestJS integration
"""

import argparse
import asyncio
import json
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.crawler import (
    Author,
    BaseBlogCrawler,
    BlogConfig,
    BlogPost,
    KakaoTechCrawler,
    TossTechCrawler,
    WoowahanCrawler,
)


# Blog configurations with RSS/Sitemap URLs
BLOG_CONFIGS: Dict[str, Dict[str, Any]] = {
    'woowahan': {
        'name': '우아한형제들 기술블로그',
        'class': WoowahanCrawler,
        'base_url': 'https://techblog.woowahan.com',
        'rss_url': 'https://techblog.woowahan.com/feed/',
        'company': '우아한형제들',
    },
    'kakao': {
        'name': '카카오테크 기술블로그',
        'class': KakaoTechCrawler,
        'base_url': 'https://tech.kakao.com',
        'rss_url': 'https://tech.kakao.com/feed/',
        'company': '카카오',
    },
    'toss': {
        'name': '토스 기술 블로그',
        'class': TossTechCrawler,
        'base_url': 'https://toss.tech',
        'rss_url': 'https://toss.tech/rss.xml',
        'company': '토스',
    },
    'naver-d2': {
        'name': '네이버 D2',
        'class': BaseBlogCrawler,  # Uses base implementation
        'base_url': 'https://d2.naver.com',
        'rss_url': 'https://d2.naver.com/helloworld/feed',
        'company': '네이버',
    },
    'line': {
        'name': 'LINE Engineering',
        'class': BaseBlogCrawler,
        'base_url': 'https://engineering.linecorp.com/ko',
        'rss_url': 'https://engineering.linecorp.com/ko/feed/',
        'company': 'LINE',
    },
    'daangn': {
        'name': '당근마켓 기술 블로그',
        'class': BaseBlogCrawler,
        'base_url': 'https://medium.com/daangn',
        'rss_url': 'https://medium.com/feed/daangn',
        'company': '당근마켓',
    },
    'banksalad': {
        'name': '뱅크샐러드 기술 블로그',
        'class': BaseBlogCrawler,
        'base_url': 'https://blog.banksalad.com',
        'rss_url': 'https://blog.banksalad.com/rss.xml',
        'company': '뱅크샐러드',
    },
}


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def serialize_author(author: Optional[Author]) -> Optional[Dict[str, Any]]:
    """Serialize Author dataclass to dict"""
    if author is None:
        return None
    return {
        'name': author.name,
        'email': author.email,
        'bio': author.bio,
        'avatar_url': author.avatar_url,
        'github_url': author.github_url,
        'company': author.company,
        'job_title': author.job_title,
        'team': author.team,
        'is_team': author.is_team,
        'metadata': author.metadata,
    }


def serialize_post(post: BlogPost) -> Dict[str, Any]:
    """Serialize BlogPost dataclass to dict"""
    return {
        'title': post.title,
        'url': post.url,
        'excerpt': post.excerpt,
        'content': post.content[:1000] if post.content else None,  # Truncate for JSON output
        'author': serialize_author(post.author),
        'category': post.category,
        'tags': post.tags or [],
        'published_date': post.published_date.isoformat() if post.published_date else None,
        'word_count': post.word_count,
        'read_time': post.read_time,
        'featured_image_url': post.featured_image_url,
    }


async def discover_posts(blog_key: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Discover posts from a blog's RSS feed"""
    if blog_key not in BLOG_CONFIGS:
        raise ValueError(f"Unknown blog: {blog_key}. Available: {list(BLOG_CONFIGS.keys())}")
    
    config_data = BLOG_CONFIGS[blog_key]
    
    config = BlogConfig(
        name=config_data['name'],
        base_url=config_data['base_url'],
        rss_url=config_data['rss_url'],
        rate_limit=0.5,
        timeout=30,
        max_retries=3,
    )
    
    # Create a generic crawler for RSS parsing
    class GenericCrawler(BaseBlogCrawler):
        async def discover_posts(self) -> List[BlogPost]:
            if not self.config.rss_url:
                return []
            rss_content = await self.fetch_page(self.config.rss_url)
            return self.parse_rss_feed(rss_content) if rss_content else []
        
        async def extract_author_info(self, soup, post_url):
            import re
            
            precise_author_selectors = [
                '.author-name', '.post-author-name', '.writer-name',
                '.byline-name', '.meta-author-name',
                '[class*="author-name"]', '[class*="writer-name"]',
            ]
            
            name = None
            for selector in precise_author_selectors:
                element = soup.select_one(selector)
                if element:
                    name = element.get_text(strip=True)
                    break
            
            if not name:
                broad_selectors = [
                    '.author', '.writer', '.byline', '[class*="author"]'
                ]
                for selector in broad_selectors:
                    element = soup.select_one(selector)
                    if element:
                        raw_text = element.get_text(strip=True)
                        name = re.sub(r'\d{4}년\s*\d{1,2}월\s*\d{1,2}일', '', raw_text)
                        name = re.sub(r'\d{4}-\d{2}-\d{2}', '', name)
                        if '·' in name:
                            name = name.split('·')[0].strip()
                        name = name.strip()
                        if name:
                            break
            
            return Author(
                name=name or 'Unknown',
                company=config_data.get('company')
            )
    
    db_path = Path('/tmp/blog_crawler_temp.db')
    crawler = GenericCrawler(config, db_path)
    
    async with crawler:
        posts = await crawler.discover_posts()
        
        # Limit results
        posts = posts[:limit]
        
        # Enrich with author info (fetch individual pages)
        enriched_posts = []
        for post in posts:
            try:
                html = await crawler.fetch_page(post.url)
                if html:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(html, 'html.parser')
                    post.author = await crawler.extract_author_info(soup, post.url)
            except Exception:
                post.author = Author(name='Unknown', company=config_data.get('company'))
            
            enriched_posts.append(serialize_post(post))
        
        return enriched_posts


async def crawl_authors(blog_key: str, limit: int = 50) -> Dict[str, Any]:
    """
    Crawl a blog and extract unique authors with their metadata.
    Returns authors and stats for NestJS integration.
    """
    posts = await discover_posts(blog_key, limit)
    
    # Extract unique authors
    authors_map: Dict[str, Dict[str, Any]] = {}
    
    for post in posts:
        author = post.get('author')
        if author and author.get('name') and author['name'] != 'Unknown':
            author_key = author['name'].lower().strip()
            
            if author_key not in authors_map:
                authors_map[author_key] = {
                    'name': author['name'],
                    'email': author.get('email'),
                    'bio': author.get('bio'),
                    'avatar_url': author.get('avatar_url'),
                    'github_url': author.get('github_url'),
                    'company': author.get('company'),
                    'job_title': author.get('job_title'),
                    'team': author.get('team'),
                    'is_team': author.get('is_team', False),
                    'posts': [],
                }
            
            authors_map[author_key]['posts'].append({
                'title': post['title'],
                'url': post['url'],
                'published_date': post['published_date'],
            })
    
    authors = list(authors_map.values())
    
    return {
        'blog': BLOG_CONFIGS[blog_key]['name'],
        'company': BLOG_CONFIGS[blog_key]['company'],
        'authors_count': len(authors),
        'posts_count': len(posts),
        'authors': authors,
    }


def list_blogs() -> List[Dict[str, str]]:
    """List all available blogs"""
    return [
        {
            'key': key,
            'name': config['name'],
            'company': config['company'],
            'base_url': config['base_url'],
            'rss_url': config['rss_url'],
        }
        for key, config in BLOG_CONFIGS.items()
    ]


def main():
    parser = argparse.ArgumentParser(
        description='Korean Tech Blog Crawler CLI - JSON output for NestJS integration'
    )
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # List blogs command
    list_parser = subparsers.add_parser('list', help='List available blogs')
    
    # Discover posts command
    discover_parser = subparsers.add_parser('discover', help='Discover posts from a blog')
    discover_parser.add_argument('blog', help='Blog key (e.g., woowahan, kakao, toss)')
    discover_parser.add_argument('--limit', type=int, default=50, help='Maximum posts to fetch')
    
    # Crawl authors command
    crawl_parser = subparsers.add_parser('authors', help='Crawl and extract unique authors')
    crawl_parser.add_argument('blog', help='Blog key (e.g., woowahan, kakao, toss)')
    crawl_parser.add_argument('--limit', type=int, default=50, help='Maximum posts to process')
    
    args = parser.parse_args()
    
    try:
        if args.command == 'list':
            result = list_blogs()
        elif args.command == 'discover':
            result = asyncio.run(discover_posts(args.blog, args.limit))
        elif args.command == 'authors':
            result = asyncio.run(crawl_authors(args.blog, args.limit))
        else:
            parser.print_help()
            sys.exit(1)
        
        # Output JSON to stdout
        print(json.dumps(result, cls=JSONEncoder, ensure_ascii=False, indent=2))
        sys.exit(0)
        
    except Exception as e:
        error_response = {
            'error': True,
            'message': str(e),
            'type': type(e).__name__,
        }
        print(json.dumps(error_response, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
