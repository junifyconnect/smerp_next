---
alwaysApply: true
---

# 파일 업로드 구현 가이드

## 개요

프로젝트의 파일 업로드 시스템은 **S3 Presigned URL** 방식을 사용하여 안전하고 확장 가능한 파일 업로드를 지원합니다.

## 핵심 구조

### 1. 업로드 설정 (`uploaderType.ts`)

```typescript
import { 
  getAcceptMimeTypes, 
  getFileExtensions, 
  getMaxFileSize,
  formatFileSize 
} from '@/types/uploaderType'

// 업로드 타입 정의
const uploadType = 'ADMIN_PROFILE' as const

// 설정된 MIME 타입 조회
const acceptTypes = getAcceptMimeTypes(uploadType)
// 결과: "image/jpeg,image/jpg,image/png,image/gif"

// 사용자 친화적 확장자 표시
const extensions = getFileExtensions(uploadType)
// 결과: "JPG, PNG, GIF, JPEG"

// 최대 파일 크기 조회
const maxSize = getMaxFileSize(uploadType)
// 결과: "3.1 MB"
```

### 2. 파일 업로드 훅 사용

`useFileUpload` 훅은 파일 업로드의 전체 플로우를 처리합니다:
- ✅ 파일 타입 및 크기 검증
- ✅ Presigned URL 요청
- ✅ S3 직접 업로드
- ✅ 메타데이터 저장

#### 기본 사용법

```typescript
'use client'

import { useFileUpload } from '@/hooks/useFileUpload'
import { toast } from 'sonner'

export function MyComponent() {
  const { uploadFile, isLoading } = useFileUpload({
    uploadType: 'ADMIN_PROFILE'
  })

  const handleFileSelect = async (file: File) => {
    const result = await uploadFile(file)

    // 에러 처리
    if (!result.success) {
      toast.error(result.data)
      return
    }

    // 성공 처리
    const { fileId, s3Url } = result.data
    console.log('Uploaded:', { fileId, s3Url })
    toast.success('파일 업로드 완료')
  }

  return (
    <input 
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) handleFileSelect(file)
      }}
      disabled={isLoading}
    />
  )
}
```

### 3. 에러 코드 관리

파일 업로드 관련 에러는 `responseCode.ts`에서 중앙화됩니다:

```typescript
// 에러 코드 (응답 메시지 포함)
- INVALID_FILE_TYPE: "지원하지 않는 파일 형식입니다"
- INVALID_FILE_SIZE: "파일 크기가 너무 큽니다"
- PRESIGNED_URL_GENERATION_FAILED: "Presigned URL 생성에 실패했습니다"
- FILE_METADATA_SAVE_FAILED: "파일 메타데이터 저장에 실패했습니다"
- S3_UPLOAD_FAILED: "S3 업로드에 실패했습니다"
```

로그에는 상세 정보가 남습니다:

```typescript
// 타입 검증 실패 시
Error: Attempted file type: application/pdf

// 크기 검증 실패 시
Error: Attempted file size: 10.5 MB (max: 3.1 MB)
```

### 4. UI 컴포넌트 예제

#### 아바타 업로드 (AvatarUpload.tsx)

```typescript
'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useFileUpload } from '@/hooks/useFileUpload'
import { toast } from 'sonner'
import { 
  getAcceptMimeTypes, 
  getFileExtensions, 
  getMaxFileSize 
} from '@/types/uploaderType'

const uploadType = 'ADMIN_PROFILE' as const

export function AvatarUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { uploadFile, isLoading } = useFileUpload({ uploadType })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await uploadFile(file)

    if (!result.success) {
      toast.error(result.data)
      return
    }

    // 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    toast.success('파일이 성공적으로 업로드되었습니다')
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      <div onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptMimeTypes(uploadType)}
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden"
        />
        {/* UI 렌더링 */}
      </div>

      {/* 파일 정보 표시 */}
      <div className="text-center text-xs text-gray-500">
        <p>Allowed {getFileExtensions(uploadType)}</p>
        <p>Max size of {getMaxFileSize(uploadType)}</p>
      </div>

      <Button
        variant="destructive"
        onClick={() => {
          setPreviewUrl(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }}
        disabled={!previewUrl || isLoading}
      >
        삭제
      </Button>
    </div>
  )
}
```

### 5. 새로운 업로드 타입 추가하기

`uploaderType.ts`에 새 업로드 타입을 추가하려면:

```typescript
export const FILE_UPLOAD_CONFIG = {
  // 기존 설정...
  
  // 새로운 타입 추가
  ADMIN_DOCUMENT: {
    path: 'admin/documents',
    allowedTypes: ['application/pdf', 'application/msword'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
}
```

그러면 자동으로 타입 안전성이 보장됩니다:

```typescript
const { uploadFile, isLoading } = useFileUpload({ 
  uploadType: 'ADMIN_DOCUMENT' // ✅ 타입 체크됨
})
```

## 에러 처리 패턴

### 클라이언트 컴포넌트에서

```typescript
const result = await uploadFile(file)

if (!result.success) {
  // result.data는 responseCode.ts에서 정의한 메시지
  toast.error(result.data)
  return
}

// 성공 케이스
const { fileId, s3Url } = result.data
```

### 서버 액션에서

```typescript
import { actionError, actionSuccess } from '@/lib/response/responseHandler'

export async function saveUserProfile(fileId: string, s3Url: string) {
  try {
    // 파일 처리 로직
    return actionSuccess({ 
      success: true 
    })
  } catch (error) {
    return actionError('INTERNAL_SERVER_ERROR', error)
  }
}
```

## 플로우 다이어그램

```
사용자 파일 선택
    ↓
useFileUpload.uploadFile(file)
    ↓
1. 파일 타입 검증 (INVALID_FILE_TYPE 에러 가능)
    ↓
2. 파일 크기 검증 (INVALID_FILE_SIZE 에러 가능)
    ↓
3. getPresignedUrl() → S3 Presigned URL 요청
    ↓
4. fetch(presignedUrl) → S3에 직접 PUT 업로드
    ↓
5. saveFileMetadata() → DB에 메타데이터 저장
    ↓
성공 또는 에러 응답
    ↓
클라이언트에서 toast로 피드백
```

## 주의사항

1. **항상 유틸리티 함수 사용**
   - `getAcceptMimeTypes()`, `getFileExtensions()`, `getMaxFileSize()` 등을 사용
   - 설정 변경 시 한 곳에서만 수정 가능

2. **에러 메시지는 responseCode.ts에서 관리**
   - 동적 메시지는 Error 객체에만 넣기
   - 사용자에게 보이는 메시지는 responseCode.ts에서 관리

3. **로그는 자동으로 남겨짐**
   - Error 객체의 내용이 console.error에 자동으로 기록됨
   - 파일 타입/크기 정보가 로그에 남음

4. **타입 안전성**
   - FileUploadType은 FILE_UPLOAD_CONFIG의 키로부터 자동 추론
   - 존재하지 않는 업로드 타입은 컴파일 타임에 감지됨
