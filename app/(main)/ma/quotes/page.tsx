import { DocumentList } from '@/components/documents'

export default function MAQuotesPage() {
  return (
    <DocumentList
      docType="MA_QUOTE"
      basePath="/ma/quotes"
      title="MA 견적서 관리"
    />
  )
}
