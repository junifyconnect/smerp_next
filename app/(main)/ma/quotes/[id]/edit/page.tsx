'use client'

import { MADocumentForm } from '@/components/documents/MADocumentForm'
import { useParams } from 'next/navigation'

export default function EditMAQuotePage() {
  const params = useParams()
  const id = params.id as string

  return (
    <MADocumentForm
      docType="MA_QUOTE"
      basePath="/ma/quotes"
      title="MA 견적서 수정"
      documentId={id}
    />
  )
}
