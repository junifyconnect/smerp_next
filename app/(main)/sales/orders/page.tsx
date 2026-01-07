import { DocumentList } from '@/components/documents'

export default function SalesOrdersPage() {
  return (
    <DocumentList
      docType="SALES_ORDER"
      basePath="/sales/orders"
      title="발주서 관리"
    />
  )
}
