# Java/Spring Boot 코드 스타일

## 적용 대상
- `backend-java/` 디렉토리

## 코드 스타일
- Java 21, Spring Boot 3.2
- Lombok 사용 가능 (`@Data`, `@Builder`, `@RequiredArgsConstructor`)
- JPA + Flyway 마이그레이션
- Bean Validation으로 입력 검증 (`@Valid`, `@NotNull`, `@Size`)
- 패키지 구조: 도메인별 분리

## 의존성 주입
- 생성자 주입 선호 (필드 주입 지양)
- `@RequiredArgsConstructor` + `final` 필드 패턴

## 테스트 규칙
- 파일명: `*Test.java` (src/test 디렉토리)
- JUnit 5 + Mockito
- `@SpringBootTest`는 통합 테스트에만
- 단위 테스트는 `@ExtendWith(MockitoExtension.class)`

## 명령어
```bash
cd backend-java
./mvnw clean install     # 빌드 + 테스트
./mvnw test              # 테스트만
./mvnw spring-boot:run   # 실행
./mvnw flyway:migrate    # DB 마이그레이션
```

## PR 체크리스트
- [ ] `./mvnw clean install` 성공
- [ ] 테스트 통과
- [ ] Checkstyle 경고 없음 (설정된 경우)
