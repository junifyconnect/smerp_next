import { DocumentDetail } from '@/components/documents'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SalesOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <DocumentDetail
      documentId={id}
      basePath="/sales/orders"
    />
  )
}
