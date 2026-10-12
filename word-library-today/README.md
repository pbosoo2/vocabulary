# 단어의 서재
외부 의존성이 없는 HTML/CSS/JavaScript 카드형 단어장입니다.

## 시작
- index.html을 브라우저에서 열거나 폴더를 정적 사이트로 배포합니다.
- 현재 Notion 단어 조회 결과는 0건이므로 실제 words.json은 비어 있습니다.
- 예시 둘러보기는 화면 확인용 예시 6개이며 실제 등록/학습 기록이 아닙니다.
- JSON 불러오기는 현재 탭의 메모리에서만 유지됩니다. 새로고침 후에는 words.json을 다시 읽습니다.
- 별표 보관만 해당 브라우저 localStorage에 저장됩니다.
- 음성 재생 기능은 없습니다. 기존 발음과 한글 발음을 함께 표시합니다.
- 예시의 한글 발음은 근사 표기입니다. 실제 데이터의 한글 발음이 없으면 미등록으로 표시합니다.

## 데이터 형식
words.json에 아래 형식의 배열을 넣습니다. 각 id는 고유해야 합니다.
```json
{"words":[{"id":"page-id","word":"example","language":"영어","registeredDate":"2026-10-12","reading":"발음 또는 히라가나","koreanReading":"한글 발음","meaning":"한국어 뜻","example":"예문","translation":"예문 해석","dictionaryUrl":"https://사전주소","notionUrl":"https://원본주소","studyCount":2,"lastStudied":"2026-10-12"}]}
```
초기 탭은 오늘 등록입니다. registeredDate는 YYYY-MM-DD 형식이며 Asia/Seoul 기준 오늘과 비교합니다. 등록 날짜가 없으면 전체 탭에서만 볼 수 있습니다. 예시는 오늘 날짜로 표시되지만 실제 기록은 아닙니다.
언어: 영어 또는 일본어. studyCount와 lastStudied를 모르면 생략하세요. 0을 임의로 넣지 않습니다.

## GitHub → Vercel
1. 이 폴더의 파일을 저장소 루트에 올립니다.
2. Vercel에서 저장소를 가져오고 프레임워크는 Other, 별도 빌드 없이 루트를 배포합니다.
3. GitHub 변경에 따른 Vercel 재배포는 배포 동기화입니다. Notion 데이터 자동 갱신은 아닙니다.

## 다음 단계: Notion 실시간 연동
현재 미구현입니다. Vercel 서버 함수가 서버 환경변수에 저장된 Notion 인증 정보로 데이터를 읽고, 공개해도 되는 속성만 /api/words로 반환하도록 추가해야 합니다. 프런트엔드 fetch도 해당 경로로 변경합니다.
Notion 페이지 공유와 배포 공개 범위를 확인해야 합니다. API 토큰을 HTML, words.json, GitHub 커밋에 넣지 마세요. 학습 완료 버튼의 Notion 기록 저장 역시 아직 미구현입니다.
