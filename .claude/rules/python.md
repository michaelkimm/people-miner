# Python 크롤러 코드 스타일

## 적용 대상
- `korean-blog-crawler/` 디렉토리

## 코드 스타일
- Python 3.10+
- async/await 패턴 (aiohttp, asyncio)
- ABC 베이스 클래스로 크롤러 확장 (`BaseBlogCrawler`)
- structlog로 구조화된 로깅
- mypy 타입 힌트 필수

## 프로젝트 구조
```
korean-blog-crawler/
├── src/              # 소스 코드
│   └── crawler.py    # 크롤러 구현
├── database/         # SQLite DB
├── config/           # 설정 파일
├── cli.py            # CLI 인터페이스
├── run_crawler.py    # 실행 스크립트
└── test_crawler.py   # 테스트
```

## 새 크롤러 추가
1. `BaseBlogCrawler` ABC 상속
2. `fetch_posts()`, `parse_post()` 메서드 구현
3. `test_crawler.py`에 테스트 추가

## 명령어
```bash
cd korean-blog-crawler

# 환경 설정
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 실행
python run_crawler.py --dry-run  # 테스트 실행 (DB 저장 안함)
python run_crawler.py            # 실제 실행

# 테스트 & 린트
pytest test_crawler.py           # 테스트
black .                          # 포맷팅
flake8                           # 린트
mypy src/                        # 타입 체크
```

## PR 체크리스트
- [ ] `pytest` 통과
- [ ] `black --check .` 통과
- [ ] `flake8` 경고 없음
- [ ] `mypy src/` 에러 없음
