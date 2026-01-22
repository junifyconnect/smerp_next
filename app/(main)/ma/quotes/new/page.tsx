'use client'

import { MADocumentForm } from '@/components/documents/MADocumentForm'

export default function NewMAQuotePage() {
  return (
    <MADocumentForm
      docType="MA_QUOTE"
      basePath="/ma/quotes"
      title="새 MA 견적서"
    />
  )
}
