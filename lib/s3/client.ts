import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME!

// 파일 업로드
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

// 파일 다운로드
export async function downloadFile(key: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  )
  
  const bytes = await response.Body?.transformToByteArray()
  if (!bytes) throw new Error('파일을 찾을 수 없습니다.')
  
  return Buffer.from(bytes)
}

// 파일 삭제
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  )
}

// Presigned URL 생성 (업로드용)
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(s3Client, command, { expiresIn })
}

// Presigned URL 생성 (다운로드용)
export async function getDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })
  return getSignedUrl(s3Client, command, { expiresIn })
}

// S3 키 생성 헬퍼
export function generateS3Key(
  docType: string,
  docId: string,
  fileName: string
): string {
  const date = new Date().toISOString().split('T')[0]
  return `documents/${docType}/${date}/${docId}/${fileName}`
}
