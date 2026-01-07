import { DocumentList } from '@/components/documents'

export default function SalesApprovalsPage() {
  return (
    <DocumentList
      docType="SALES_APPROVAL"
      basePath="/sales/approvals"
      title="품의서 관리"
    />
  )
}
