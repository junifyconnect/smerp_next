import { DocumentList } from '@/components/documents'

export default function SalesQuotesPage() {
  return (
    <DocumentList
      docType="SALES_QUOTE"
      basePath="/sales/quotes"
      title="견적서 관리"
    />
  )
}
