---
name: code-standards-skill
description: 기능 구현해야할때 참고해야할 모든 숙지사항입니다. 디자인 , ui , figma mcp 등 모든 프로젝트의 규칙이 들어가있는 스킬입니다. 무언가를 구현하기전에 꼭 참고하도록 하세요
---

# code-standards-skill

이 스킬은 smerp 프로젝트의 **핵심 코드 규칙과 Best Practices**를 안내합니다.

**Stack**: Next.js 16 + TypeScript + 외부 API + Zod + NextAuth v5

---

## 3가지 핵심 원칙

1. **타입 안전성** - `any` 절대 금지, 모든 타입 명시
2. **명확한 구조** - 페이지/액션/컴포넌트/타입 분리
3. **일관된 패턴** - Zod → API → Response 파이프라인

---

## 빠른 체크리스트

구현 완료 후 확인사항:

- [ ] `any` 타입 , `unknown` 타입 사용 안함
- [ ] Zod로 모든 입력값 검증
- [ ] 응답은 `actionSuccess/actionError`로만 반환
- [ ] **모든 import는 `@/` alias 사용** (상대 경로 `../` 금지)
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] 커밋 금지
- [ ] 테스트용으로 개발서버 실행하지 않기
- [ ] **테스트 코드 작성 여부 판단** (아래 기준 참고)

---

## 테스트 코드 작성 판단

기능 구현 완료 후, 테스트 코드 작성 여부를 판단합니다.

### 무조건 테스트 작성 (물어보지 않고 작성)

- **validators (Zod 스키마)**: 입력 검증 로직
- **utils 함수**: 계산, 변환, 포맷팅 등 순수 함수
- **비즈니스 핵심 로직**: 장애 시 큰 영향을 주는 코드
- **복잡한 조건 분기**: if/else가 3개 이상인 로직
- **버그가 발생했던 코드**: 재발 방지

### 사용자에게 물어보기 (애매한 경우)

- **공통 컴포넌트**: Button, Input, Modal 등 재사용 컴포넌트
- **커스텀 hooks**: 상태 관리 로직
- **조건부 렌더링**: 상태에 따라 다른 UI 표시

### 테스트 안 함 (물어보지 않음)

- **단순 레이아웃 컴포넌트**: props를 그대로 보여주기만 하는 것
- **페이지 컴포넌트**: E2E로 커버
- **스타일만 있는 컴포넌트**: 로직 없음
- **외부 라이브러리 래퍼**: 이미 테스트된 코드

### 테스트 파일 위치

```
__tests__/
├── unit/           ← 단위 테스트 (lib, validators, hooks)
├── components/     ← 컴포넌트 테스트
└── integration/    ← 통합 테스트
```

**상세 가이드**: test-skill 참고

---

## Import 규칙

**모든 import는 `@/` alias를 사용합니다. 상대 경로(`./`, `../`)는 사용하지 않습니다.**

```tsx
// ✅ 올바른 예시
import { Button } from '@/components/common/Button'
import { CampaignEditorHeader } from '@/app/(client)/(protected)/campaign/(editor)/_components/CampaignEditorHeader'
import { CHANNEL_OPTIONS } from '@/app/(client)/(protected)/campaign/(editor)/_lib/data'

// ❌ 잘못된 예시
import { Button } from '../../../components/common/Button'
import { CampaignEditorHeader } from '../../_components/CampaignEditorHeader'
```

**이유:**
- 일관된 import 스타일 유지
- 파일 위치와 관계없이 동일한 경로 사용
- 코드 가독성 향상

---

## 폴더 구조 규칙

**PageClient 컴포넌트는 `_client/` 폴더에, 일반 컴포넌트는 `_components/` 폴더에, 다이얼로그는 `_dialogs/` 폴더에 분리합니다.**

```
feature/
├── page.tsx                          ← Server Component (entry)
├── _client/
│   └── FeaturePageClient.tsx         ← Page Client Component
├── _components/
│   └── FeatureCard.tsx               ← 일반 컴포넌트
├── _dialogs/
│   └── FeatureEditDialog.tsx         ← 다이얼로그 컴포넌트
├── _lib/
│   └── data.ts                       ← 상수, 유틸리티
└── _types/
    └── feature.ts                    ← 타입 정의
```

**다이얼로그 네이밍 규칙:**
- 파일명: `*Dialog.tsx` (Modal 아님)
- 컴포넌트명: `*Dialog`
- 인터페이스명: `*DialogProps`
- 공통 컴포넌트 `Dialog` (`@/components/common/Dialog`) 사용

**이유:**
- Page Client와 일반 컴포넌트, 다이얼로그 역할 구분
- 폴더만 보고 파일 역할 파악 가능
- 다이얼로그가 많아질수록 `_components` 폴더가 복잡해지는 것 방지

---

## 상세 가이드

UI 구현 시 필요한 구체적인 가이드들:

- **[Figma 추출](./guides/FIGMA_EXTRACTION.md)** - Figma에서 디자인 정보 추출하기
- **[구현 패턴](./guides/IMPLEMENTATION.md)** - 컴포넌트 구현 Best Practices
- **[문제 해결](./guides/TROUBLESHOOTING.md)** - 자주 발생하는 이슈 및 해결 방법

---

## 예제 가이드 (상세)

각 상황별 올바른/틀린 패턴을 다양한 예제로 제시합니다:

### Server Actions & 데이터 처리 (핵심)

- **[Server Actions](./examples/01-server-actions.md)**
  - **언제**: Server Action을 작성할 때 (CRUD 작업, 폼 제출, API 호출 등)
  - **핵심**: `action.inputSchema(schema).action(async ({ parsedInput }) => ...)` 패턴 사용
  - **필수**: 필수 - 모든 Server Action 작성 시 반드시 참고

- **[Zod 검증](./examples/02-zod-validation.md)**
  - **언제**: Server Action의 입력값을 검증할 때
  - **핵심**: `inputSchema(z.object({ ... }))` - 모든 입력값은 Zod로 검증
  - **필수**: 필수 - 모든 Server Action에 inputSchema 필수

- **[타입 & 응답](./examples/03-types-and-responses.md)**
  - **언제**: Server Action의 응답 타입을 정의할 때
  - **핵심**: `actionSuccess(data, 'OK')` / `actionError('CODE', error)` - 일관된 응답
  - **필수**: 필수 - 모든 Server Action에서 일관된 응답 타입 사용

- **[에러 처리](./examples/05-error-handling.md)**
  - **언제**: Server Action에서 에러를 처리할 때
  - **핵심**: `try { ... } catch (error) { return actionError('CODE', error) }` - 모든 에러는 actionError로 반환
  - **필수**: 필수 - 모든 Server Action에서 일관된 에러 처리

- **[Action Handler 패턴](./examples/20-action-handler-pattern.md)**
  - **언제**: Client Component에서 Server Action을 호출할 때
  - **핵심**: `const executeAction = useExecuteAction()` → `await executeAction(() => myAction(data))` - 자동 에러 처리
  - **필수**: 필수 - Client에서 Server Action 호출 시 반드시 사용

### 인증 & 보안

- **[인증 & 권한](./examples/08-auth-and-permissions.md)**
  - **언제**: 로그인이 필요한 기능을 구현할 때, 권한 체크가 필요할 때
  - **핵심**: `actionAuth` 사용 시 `ctx.userId` 자동 제공, 미들웨어에서 인증 자동 처리
  - **필수**: 필수 - 인증/권한이 필요한 모든 Server Action

- **[보안](./examples/07-security-passwords.md)**
  - **언제**: 비밀번호 처리, 민감 정보 저장 시
  - **핵심**: `bcrypt.hash(password, 10)` / `bcrypt.compare(input, hashed)` - 비밀번호 해싱
  - **필수**: 선택 - 비밀번호 관련 기능 구현 시

### UI & 컴포넌트

- **[공통 컴포넌트](./examples/22-common-components.md)**
  - **언제**: UI를 구현할 때 (버튼, 입력창, 셀렉트 등)
  - **핵심**: `src/components/common/` 폴더 먼저 확인 → Figma와 ±3px 차이면 공통 컴포넌트 사용
  - **필수**: 필수 - 모든 UI 구현 시 반드시 먼저 확인

- **[Client Components](./examples/09-client-components.md)**
  - **언제**: 클라이언트 컴포넌트를 작성할 때 (폼, 버튼, 인터랙션 등)
  - **핵심**: `'use client'` 선언, `useExecuteAction()` 사용, Props 타입 정의
  - **필수**: 필수 - 모든 Client Component 작성 시

- **[페이지 구조](./examples/06-page-structure.md)**
  - **언제**: 신규 페이지를 생성할 때
  - **핵심**: `page.tsx` (Server), `_components/` (Client), `_actions/` (Server Actions), `_types/` (타입)
  - **필수**: 필수 - 새 페이지 생성 시

- **[Figma 구현](./examples/10-figma-implementation.md)**
  - **언제**: Figma 디자인을 코드로 구현할 때
  - **핵심**: Figma MCP로 디자인 정보 추출 → TailwindCSS로 구현
  - **필수**: 필수 - Figma node link가 언급되면 반드시 확인

- **[Admin 컴포넌트](./examples/11-admin-components-shadcn.md)**
  - **언제**: 관리자 페이지 UI를 구현할 때
  - **핵심**: shadcn/ui 컴포넌트 사용, `npx shadcn@latest add [component]`
  - **필수**: 선택 - Admin 페이지 작업 시

- **[AdminSidebar 예제](./examples/12-admin-sidebar-example.md)**
  - **언제**: 관리자 사이드바를 참고할 때
  - **필수**: 선택 - Admin 사이드바 수정 시

- **[아이콘 컴포넌트](./examples/14-icon-components.md)**
  - **언제**: SVG 아이콘을 컴포넌트로 만들 때
  - **핵심**: SVG → React Component, `interface IconProps { className?: string }`
  - **필수**: 선택 - 커스텀 아이콘 구현 시

- **[Design System Playground](./examples/23-design-system-playground.md)**
  - **언제**: `/design-system` 페이지에 새 컴포넌트 데모 추가할 때
  - **핵심**: 섹션 파일에 추가 → index.ts export → page.tsx 네비게이션 등록
  - **필수**: 선택 - 공통 컴포넌트 추가 후 플레이그라운드에 등록할 때

### 데이터 로딩 & 상태 관리

- **[Unwrap 패턴](./examples/21-unwrap-pattern.md)**
  - **언제**: Server Component (page.tsx)에서 Server Action 호출 시
  - **핵심**: `const [data] = await unwrapAll([getUsers()])` - 에러 처리 자동화
  - **필수**: 필수 - 모든 Server Component에서 Server Action 호출 시

- **[초기 데이터 패턴](./examples/15-initial-data-pattern.md)**
  - **언제**: 페이지 로드 시 초기 데이터가 필요할 때
  - **핵심**: Server Component에서 `unwrapAll` 사용 → Client Component로 `initialData` props 전달
  - **필수**: 필수 - 초기 데이터가 있는 모든 페이지

- **[Context 패턴](./examples/16-context-pattern.md)**
  - **언제**: 컴포넌트 간 상태를 공유할 때 (필터, 선택 항목 등)
  - **핵심**: `createContext()` + `useContext()`, Provider로 감싸기
  - **필수**: 필수 - 복잡한 상태 공유가 필요한 페이지

- **[서버 사이드 페이지네이션](./examples/17-server-side-pagination.md)**
  - **언제**: 대량 데이터를 페이지네이션으로 표시할 때
  - **핵심**: API 호출로 페이지별 데이터 조회
  - **필수**: 필수 - 리스트 페이지 구현 시

- **[nuqs URL 상태 관리](./examples/19-nuqs-url-state-management.md)**
  - **언제**: 필터, 검색, 페이지 상태를 URL에 저장할 때
  - **핵심**: `useQueryStates({ page: parseAsInteger, search: parseAsString })` - URL 기반 상태 관리
  - **필수**: 필수 - 필터/검색이 있는 모든 페이지

### 기타 기능

- **[Modal 패턴](./examples/18-modal-pattern.md)**
  - **언제**: 모달(다이얼로그)을 구현할 때
  - **핵심**: `QuickEditModal` 컴포넌트 사용, Server Action 연동
  - **필수**: 필수 - 모달 구현 시

- **[파일 업로드](./examples/13-file-upload.md)**
  - **언제**: 파일 업로드 기능을 구현할 때
  - **핵심**: S3 Presigned URL 생성 → 클라이언트에서 직접 업로드
  - **필수**: 선택 - 파일 업로드 기능 구현 시
