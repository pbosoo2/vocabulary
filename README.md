# 단어의 서재 — 개인용 Notion 단어장

비밀번호 로그인 후에만 서버가 Notion 단어를 반환합니다. 정적 HTML에는 실제 단어나 인증 정보를 저장하지 않습니다. 토큰을 코드/커밋/프런트엔드/localStorage에 넣지 마세요.

## 현재 구현
- 오늘 등록 → 영어 → 일본어 → 보관 → 전체
- 한국 시간(Asia/Seoul) 기준 오늘 등록 필터
- 발음·읽기와 별도 한글 발음, 뜻 숨기기, 한 장씩 공부하기
- 오른쪽 아래 고정 공부 버튼
- 서버 로그인: 7일 HttpOnly/Secure/SameSite=Strict 서명 쿠키
- 로그인 전 /api/words는 차단, 비공개 no-store 응답
- Notion 읽기 전용 조회: 로그인 후, 새로고침, 활성 탭에서 60초마다 확인
- 학습 완료 시 Notion 기록 저장은 미구현. 기존 Notion 학습 기록에 직접 남깁니다.
- 불러오기/내보내기/예시 기능 제거
- 이 버전은 브라우저에서 직접 사용합니다. 로그인 보안을 위해 외부 iframe/Notion 임베드 표시를 차단합니다.

## 1. Notion 연결 만들기
공식 안내: https://developers.notion.com/guides/get-started/internal-connections
개발자 포털의 Internal connections에서 연결을 만들고 Read content 권한만 부여하세요.
Content access에서 **단어 등록 원본 데이터베이스**와 **학습 기록 원본 데이터베이스**에 접근 권한을 부여하세요. 링크된 보기만 공유하면 충분하지 않을 수 있습니다. 관련 DB 권한이 없으면 롤업이 불완전할 수 있습니다.
워크스페이스 Owner 권한이 필요한 경우 소유자에게 요청하세요. Notion 페이지를 웹에 공개할 필요는 없습니다.

## 2. Vercel 환경변수
Vercel → vocabulary 프로젝트 → Settings → Environment Variables.
아래 값은 사용자가 직접 해당 입력란에 넣습니다. 채팅에 보내지 마세요.

| 변수 | 값 |
|---|---|
| `NOTION_TOKEN` | 위 연결 Configuration에서 받은 API token |
| `APP_PASSWORD` | 비밀번호 관리자로 생성한 무작위 비밀번호, 최소 16자(24자 이상 권장) |
| `SESSION_SECRET` | 별도로 생성한 무작위 문자열, 최소 32자(64자 이상 권장). 비밀번호와 다르게 설정 |

Node가 있는 본인 컴퓨터에서 세션 키를 생성하려면 `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`를 사용할 수 있습니다. 결과는 Vercel에만 넣으세요.
토큰을 브라우저에 노출하는 `NEXT_PUBLIC_`, `VITE_` 접두사를 붙이지 마세요.
기본 단어 data source ID는 `3f7551f3-818b-8095-93b4-000bc45e4202`입니다. 다른 단어 DB로 변경할 때만 `NOTION_DATA_SOURCE_ID` 환경변수를 설정합니다. 이 값은 데이터베이스 페이지 ID가 아니라 data source ID입니다.

환경변수는 Production에 설정합니다. PR Preview도 검사하려면 Preview에도 설정하세요. 설정 후 반드시 재배포해야 합니다. Vercel에서 Framework Preset은 Other, Build Command는 비워두거나 Override를 꺼두고, Output Directory는 기본 루트를 사용합니다. Serverless Functions를 포함한 배포여야 합니다.

## 3. 배포와 사용
PR을 main에 병합하면 GitHub 연결에 따라 Vercel이 재배포합니다. 환경변수가 없다면 로그인은 오류를 표시하며 데이터 API는 차단됩니다(자동으로 공개되지 않음).
배포 사이트에서 APP_PASSWORD로 로그인하세요. 서버가 지원하는 설정인지를 배포 후 직접 확인해야 합니다.

## Notion 속성 매핑
| Notion | 카드 데이터 |
|---|---|
| 단어 | word |
| 언어 (영어/일본어) | language |
| 발음·읽기 | reading |
| 한글 발음 (선택 텍스트 속성) | koreanReading |
| 한국어 뜻 | meaning |
| 예문 / 예문 해석 | example / translation |
| 사전 링크 | dictionaryUrl |
| 등록 날짜 | registeredDate |
| 총 학습 횟수 / 마지막 학습일 | studyCount / lastStudied |

기존 속성 ID를 우선 사용하므로 이름 변경에도 대부분 대응합니다. 한글 발음 속성은 현재 원본 DB에서 확인되지 않았으므로 자동 생성하거나 추측하지 않습니다. 텍스트 속성 `한글 발음`을 추가해 입력하면 표시됩니다. 등록 날짜를 비워두면 전체/언어 탭에는 표시되지만 오늘 등록에는 표시되지 않습니다. 생성 시간을 등록 날짜로 임의 대체하지 않습니다.

## 보안
- API 응답은 no-store. 외부 사이트 CORS 접근과 외부 프레임 삽입을 허용하지 않습니다.
- 강력한 비밀번호를 사용하세요. 다른 사람에게 공유하면 그 사람도 로그인할 수 있습니다(단일 비밀번호 방식이며 개인별 사용자 계정은 아님).
- 로그인 실패 제한은 서버 인스턴스별 보조 제한입니다. 전역 분산 rate limit이 아닙니다. Vercel Firewall에서 /api/auth POST 추가 제한을 권장합니다.
- APP_PASSWORD 또는 SESSION_SECRET 변경 후 재배포하면 기존 세션은 무효화됩니다.
- 로그인 셸/프런트엔드 코드는 공개적으로 내려받을 수 있지만 실제 Notion 데이터는 보호된 API에서만 전달됩니다. words.json에 실제 단어를 넣지 마세요.
- Vercel 프로젝트/저장소 관리자 권한으로 환경변수를 읽을 수 있는 사람도 신뢰 범위에 포함됩니다.

## 테스트
`npm test` — 인증 차단, 설정 누락, 서명/변조/키 회전, 쿠키 옵션, CSRF origin, 날짜, Notion 페이지네이션/매핑을 검증합니다. 테스트에는 실제 인증 정보가 없습니다. 실제 Notion 연결 및 Vercel 환경변수는 배포 후 검증해야 합니다.
