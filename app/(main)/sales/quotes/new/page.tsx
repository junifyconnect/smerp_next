import { DocumentForm } from '@/components/documents'

export default function NewSalesQuotePage() {
  return (
    <DocumentForm
      docType="SALES_QUOTE"
      basePath="/sales/quotes"
      title="새 견적서 작성"
    />
  )
}

