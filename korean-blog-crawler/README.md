# Korean Tech Blog Crawler

A robust, async Python crawler designed specifically for Korean tech blogs with comprehensive author information extraction.

## Features

- 🚀 **Async/First Design**: High-performance concurrent crawling
- 👤 **Author Extraction**: Intelligent author information extraction from various blog structures
- 🗄️ **Structured Storage**: SQLite database with comprehensive schema
- 📊 **Monitoring**: Built-in statistics and error tracking
- 🔍 **Multi-source**: RSS feeds, sitemaps, and direct crawling
- 🛡️ **Rate Limiting**: Respectful crawling with configurable delays
- 📝 **Rich Metadata**: Full content, tags, categories, and metrics
- 📤 **Export Options**: JSON and CSV export capabilities

## Supported Blogs

Currently optimized for major Korean tech blogs:
- 우아한형제들 기술블로그 (Woowahan Tech Blog)
- 카카오테크 기술블로그 (Kakao Tech)
- 토스 기술 블로그 (Toss Tech)
- 네이버 D2 (Naver D2)
- 커널스크립 (Coupang Tech Blog)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd korean-blog-crawler

# Install dependencies
pip install -r requirements.txt

# Initialize database
python run_crawler.py --init-db
```

## Quick Start

```bash
# Crawl all blogs
python run_crawler.py

# Crawl specific blog
python run_crawler.py --blog "우아한형제들 기술블로그" --url "https://techblog.woowahan.com"

# Dry run (discover posts only)
python run_crawler.py --dry-run

# Verbose output
python run_crawler.py --verbose

# Export data
python run_crawler.py --export output.json
python run_crawler.py --export output.csv --format csv
```

## Database Schema

The crawler uses a comprehensive SQLite schema with the following main tables:

- **blogs**: Blog metadata and configuration
- **authors**: Author information with rich metadata
- **blog_posts**: Posts with full content and metrics
- **categories**: Hierarchical category system
- **crawl_stats**: Crawling statistics and health monitoring
- **crawl_errors**: Error logging for debugging

### Author Information Extraction

The crawler is designed to extract:
- Author names (including multiple authors)
- Job titles and roles
- Company/team information
- Profile images and avatars
- Social media links (GitHub, LinkedIn, etc.)
- Professional bios and descriptions
- Team identification (for group posts)

## Architecture

### Core Components

1. **BaseBlogCrawler**: Abstract base class with common functionality
2. **Specific Crawlers**: Specialized crawlers for each blog platform
3. **Database Layer**: SQLite with comprehensive schema
4. **Export System**: JSON/CSV export with data transformation

### Async Design

Built on async/await for high performance:
- Concurrent HTTP requests
- Non-blocking database operations
- Configurable rate limiting
- Graceful error handling and retries

## Configuration

### Rate Limiting

Each blog can be configured with custom rate limits:

```python
config = BlogConfig(
    name="Blog Name",
    base_url="https://example.com",
    rate_limit=1.0,  # seconds between requests
    timeout=30,      # request timeout
    max_retries=3    # retry attempts
)
```

### Custom Selectors

Author extraction can be customized with CSS selectors:

```python
config.selectors = {
    'author_name': '.author-name',
    'author_bio': '.author-bio',
    'author_avatar': '.author-avatar img'
}
```

## Adding New Blogs

1. Create a new crawler class inheriting from `BaseBlogCrawler`
2. Implement `discover_posts()` and `extract_author_info()` methods
3. Add the crawler to the factory function
4. Test with dry run mode

Example:

```python
class NewBlogCrawler(BaseBlogCrawler):
    async def discover_posts(self) -> List[BlogPost]:
        # Implementation for discovering posts
        pass
    
    async def extract_author_info(self, soup: BeautifulSoup, post_url: str) -> Optional[Author]:
        # Implementation for extracting author info
        pass
```

## Data Export

### JSON Export

```json
[
  {
    "id": 1,
    "title": "게시물 제목",
    "url": "https://blog.example.com/post/1",
    "author_name": "홍길동",
    "author_company": "회사명",
    "published_date": "2024-01-01T00:00:00",
    "content": "게시물 내용...",
    "tags": ["tag1", "tag2"],
    "word_count": 1500,
    "read_time": 8
  }
]
```

### CSV Export

Exports all columns in a flat CSV format suitable for spreadsheet analysis.

## Monitoring and Debugging

### Logging

Structured logging with JSON output:

```bash
# Verbose logging with JSON output
python run_crawler.py --verbose 2>&1 | jq

# Filter for errors
python run_crawler.py 2>&1 | grep ERROR
```

### Statistics

View crawling statistics:

```sql
-- Recent crawl statistics
SELECT * FROM crawl_stats ORDER BY crawl_date DESC LIMIT 10;

-- Error analysis
SELECT blog_id, error_type, COUNT(*) as count 
FROM crawl_errors 
GROUP BY blog_id, error_type 
ORDER BY count DESC;

-- Author distribution
SELECT company, COUNT(*) as post_count 
FROM authors a 
JOIN blog_posts p ON a.id = p.author_id 
GROUP BY company 
ORDER BY post_count DESC;
```

## Performance Considerations

- **Rate Limiting**: Respectful crawling to avoid being blocked
- **Connection Pooling**: Reuse HTTP connections for efficiency
- **Database Indexing**: Optimized queries for large datasets
- **Memory Management**: Stream processing for large content

## Troubleshooting

### Common Issues

1. **Rate Limiting Errors**
   - Increase `rate_limit` in configuration
   - Add longer delays between requests

2. **Parsing Failures**
   - Check blog structure changes
   - Update CSS selectors
   - Use dry run mode for debugging

3. **Database Errors**
   - Initialize with `--init-db`
   - Check file permissions
   - Verify schema compatibility

### Debug Mode

```bash
# Enable debug logging
python run_crawler.py --verbose --dry-run

# Test specific blog
python run_crawler.py --blog "우아한형제들 기술블로그" --url "https://techblog.woowahan.com" --dry-run
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all existing tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue in the repository
- Check existing issues for solutions
- Review logs for error details
