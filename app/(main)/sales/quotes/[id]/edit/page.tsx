'use client'

import { DocumentForm } from '@/components/documents/DocumentForm'
import { useParams } from 'next/navigation'

export default function EditSalesQuotePage() {
  const params = useParams()
  const id = params.id as string

  return (
    <DocumentForm
      docType="SALES_QUOTE"
      basePath="/sales/quotes"
      title="견적서 수정"
      documentId={id}
    />
  )
}
