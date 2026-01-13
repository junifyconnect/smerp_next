import { DocumentForm } from '@/components/documents'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditSalesQuotePage({ params }: PageProps) {
  const { id } = await params
  return (
    <DocumentForm
      docType="SALES_QUOTE"
      basePath="/sales/quotes"
      title="견적서 수정"
      documentId={id}
    />
  )
}
