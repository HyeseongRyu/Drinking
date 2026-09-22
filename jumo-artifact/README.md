# 주모 (酒모)

酒(술) + 메모 = 주모. claude.ai Artifact로 배포되는 개인/소그룹용 시음 기록 웹앱.

- **현재 버전**: v1.1
- **라이브 링크**: https://claude.ai/artifact/6QYy6eh9KfwRiR1gMsweUK
- **소스**: [`jumo.html`](./jumo.html) — claude.ai에 게시된 것과 동일한 단일 HTML 파일

## 구조

단일 HTML 파일로, claude.ai의 Artifact 런타임이 제공하는 두 가지 capability에 의존한다:

- **`db`** — 술 종류별 시음 기록 저장/조회 (여러 기기·여러 사용자 간 동기화)
- **`sample`** — 술 사진 라벨을 분석해 제품명·종류·원산지·가격대·역사를 추천 (AI 라벨 분석)

빌드 과정이 없다. `jumo.html`을 그대로 claude.ai에 게시(publish)하면 배포가 끝난다.

## 이 저장소와의 관계

이 디렉토리(`jumo-artifact/`)는 배포된 Artifact의 **소스 백업 + 버전 이력**을 git으로 관리하기 위한 것이다.
실제 서비스는 이 저장소가 아니라 claude.ai에서 호스팅된다.

저장소 루트의 `client/` + `server/`는 완전히 별개의 프로젝트로, 같은 기능을 Express + SQLite + React로
직접 서버 배포하고 싶을 때 쓰는 대안 구현체다 (더 이상 동기화되지 않음).

## 버전 이력

큰 기능 변경이 있을 때마다 버전을 올리고, git 태그(`vX.Y`)와 커밋으로 남긴다. 각 태그 시점의
`jumo.html`이 그 버전의 실제 배포 소스다.

| 버전 | 주요 내용 |
|---|---|
| v1.1 | 이름 변경(시음 노트→주모), 酒 도장 아이콘, 앨범/촬영 분리, AI 라벨 분석, 닉네임 기반 다중 사용자 지원, 버그 수정 3건 |

## 에셋

- [`assets/icon.png`](./assets/icon.png) — 대표 아이콘 (1024×1024)
