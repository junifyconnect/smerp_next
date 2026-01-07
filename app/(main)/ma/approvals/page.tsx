import { DocumentList } from '@/components/documents'

export default function MAApprovalsPage() {
  return (
    <DocumentList
      docType="MA_APPROVAL"
      basePath="/ma/approvals"
      title="MA 품의서 관리"
    />
  )
}
