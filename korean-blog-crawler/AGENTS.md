# korean-blog-crawler

Async Python crawler extracting authors from Korean tech blog posts (Woowahan, Kakao, Toss, etc.)

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add new blog crawler | `src/crawler.py` | Subclass `BaseBlogCrawler` |
| Configure blog sources | `cli.py:BLOG_CONFIGS` | Dict with name, class, URLs |
| Run crawler | `run_crawler.py` | `--dry-run` for testing |
| NestJS integration | `cli.py` | JSON output via subcommands |
| Tests | `test_crawler.py` | pytest with fixtures |

## CRAWLER PATTERN

```
BaseBlogCrawler (ABC)
├── discover_posts()      # Abstract: RSS/sitemap parsing
├── extract_author_info() # Abstract: CSS selector extraction
├── fetch_page()          # Shared: aiohttp with retry
├── parse_rss_feed()      # Shared: feedparser
├── save_post()           # Shared: SQLite insert
└── crawl()               # Shared: orchestration

WoowahanCrawler / KakaoTechCrawler / TossTechCrawler
└── Override abstract methods with blog-specific selectors
```

## ADDING NEW BLOG

1. Add config to `cli.py:BLOG_CONFIGS`:
```python
'newblog': {
    'name': '새 블로그',
    'class': NewBlogCrawler,  # or BaseBlogCrawler for generic
    'base_url': 'https://blog.example.com',
    'rss_url': 'https://blog.example.com/feed/',
    'company': '회사명',
}
```

2. If custom extraction needed, subclass in `src/crawler.py`:
```python
class NewBlogCrawler(BaseBlogCrawler):
    async def discover_posts(self) -> List[BlogPost]:
        rss = await self.fetch_page(self.config.rss_url)
        return self.parse_rss_feed(rss) if rss else []
    
    async def extract_author_info(self, soup, url) -> Optional[Author]:
        el = soup.select_one('.author-name')  # Blog-specific selector
        return Author(name=el.text if el else 'Unknown', company='회사명')
```

3. Register in `create_crawler()` factory if using CLI runner

## COMMANDS

```bash
# CLI JSON output (NestJS integration)
python cli.py list                    # Available blogs
python cli.py discover woowahan       # Posts from RSS
python cli.py authors kakao --limit 20

# Full crawl with DB write
python run_crawler.py                 # All blogs
python run_crawler.py --dry-run       # Discover only, no DB
python run_crawler.py --blog "토스 기술 블로그" --url https://toss.tech

# Tests
pytest test_crawler.py -v
pytest -k "woowahan" -v               # Specific crawler tests
```

## ANTI-PATTERNS

- **DO NOT** use sync requests - all HTTP must be `aiohttp` async
- **DO NOT** skip rate limiting - `config.rate_limit` enforced
- **DO NOT** hardcode selectors in base class - override in subclass
- **AVOID** `await` in loops without semaphore
