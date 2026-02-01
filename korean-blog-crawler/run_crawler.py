#!/usr/bin/env python3
"""
Korean Tech Blog Crawler Executor
Run the crawler with proper error handling and monitoring
"""

import asyncio
import argparse
import logging
import sys
from pathlib import Path
from datetime import datetime
import json

from src.crawler import create_crawler, main as crawl_main
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

def setup_logging(verbose: bool = False):
    """Setup logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

async def run_specific_blog(blog_name: str, base_url: str, db_path: Path, dry_run: bool = False):
    """Run crawler for specific blog"""
    logger.info("Starting crawler", blog=blog_name, url=base_url, dry_run=dry_run)
    
    try:
        crawler = create_crawler(blog_name, base_url, db_path)
        
        if dry_run:
            logger.info("Dry run mode - discovering posts only")
            async with crawler:
                posts = await crawler.discover_posts()
                logger.info("Discovered posts", count=len(posts), posts=[p.title[:50] for p in posts[:5]])
            return
        
        async with crawler:
            stats = await crawler.crawl()
            logger.info("Crawling completed", blog=blog_name, stats=stats)
            
    except Exception as e:
        logger.error("Crawling failed", blog=blog_name, error=str(e), exc_info=True)
        raise

async def run_all_blogs(db_path: Path, dry_run: bool = False):
    """Run crawler for all configured blogs"""
    blogs = [
        ('우아한형제들 기술블로그', 'https://techblog.woowahan.com'),
        ('카카오테크 기술블로그', 'https://tech.kakao.com'),
        ('토스 기술 블로그', 'https://toss.tech'),
        ('네이버 D2', 'https://d2.naver.com'),
    ]
    
    total_stats = {
        'posts_found': 0,
        'posts_new': 0,
        'authors_found': 0,
        'errors': 0
    }
    
    start_time = datetime.now()
    
    for blog_name, base_url in blogs:
        try:
            if dry_run:
                await run_specific_blog(blog_name, base_url, db_path, dry_run=True)
            else:
                crawler = create_crawler(blog_name, base_url, db_path)
                async with crawler:
                    stats = await crawler.crawl()
                    
                    for key in total_stats:
                        total_stats[key] += stats.get(key, 0)
                    
                    logger.info("Blog completed", blog=blog_name, stats=stats)
                    
        except Exception as e:
            logger.error("Blog failed", blog=blog_name, error=str(e))
            total_stats['errors'] += 1
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    if not dry_run:
        logger.info(
            "All crawling completed",
            total_stats=total_stats,
            duration_seconds=duration,
            duration_minutes=duration/60
        )

def create_database_schema(db_path: Path):
    """Initialize database with schema"""
    import sqlite3
    
    with open(db_path.parent / "database" / "schema.sql") as f:
        schema = f.read()
    
    with sqlite3.connect(db_path) as conn:
        conn.executescript(schema)
        logger.info("Database schema created", path=str(db_path))

def export_data(db_path: Path, output_path: Path, format: str = 'json'):
    """Export crawled data to various formats"""
    import sqlite3
    
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        
        # Get posts with authors
        query = """
        SELECT 
            bp.*,
            a.name as author_name,
            a.company as author_company,
            a.job_title as author_job_title
        FROM blog_posts bp
        LEFT JOIN authors a ON bp.author_id = a.id
        ORDER BY bp.published_date DESC
        """
        
        cursor = conn.execute(query)
        posts = [dict(row) for row in cursor.fetchall()]
        
        # Convert dates and parse JSON fields
        for post in posts:
            if post['published_date']:
                post['published_date'] = datetime.fromisoformat(post['published_date'])
            if post['tags']:
                post['tags'] = json.loads(post['tags'])
            if post['metadata']:
                post['metadata'] = json.loads(post['metadata'])
        
        if format.lower() == 'json':
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(posts, f, ensure_ascii=False, indent=2, default=str)
        
        elif format.lower() == 'csv':
            import pandas as pd
            df = pd.DataFrame(posts)
            df.to_csv(output_path, index=False, encoding='utf-8')
        
        logger.info("Data exported", format=format, output_path=str(output_path), posts_count=len(posts))

async def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(description='Korean Tech Blog Crawler')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    parser.add_argument('--dry-run', action='store_true', help='Discover posts without full crawling')
    parser.add_argument('--blog', help='Run specific blog only')
    parser.add_argument('--url', help='Base URL for specific blog')
    parser.add_argument('--db', default='korean_blog_crawler.db', help='Database file path')
    parser.add_argument('--init-db', action='store_true', help='Initialize database schema')
    parser.add_argument('--export', help='Export data to file')
    parser.add_argument('--format', choices=['json', 'csv'], default='json', help='Export format')
    
    args = parser.parse_args()
    
    setup_logging(args.verbose)
    db_path = Path(args.db)
    
    # Initialize database if requested
    if args.init_db:
        create_database_schema(db_path)
        return
    
    # Export data if requested
    if args.export:
        export_data(db_path, Path(args.export), args.format)
        return
    
    # Run crawlers
    if args.blog and args.url:
        await run_specific_blog(args.blog, args.url, db_path, args.dry_run)
    else:
        await run_all_blogs(db_path, args.dry_run)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Crawling interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error("Unexpected error", error=str(e), exc_info=True)
        sys.exit(1)
