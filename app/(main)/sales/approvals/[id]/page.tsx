import { DocumentDetail } from '@/components/documents'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SalesApprovalDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <DocumentDetail
      documentId={id}
      basePath="/sales/approvals"
    />
  )
}
