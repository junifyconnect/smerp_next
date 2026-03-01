import prisma from '@/lib/db'
import { NotificationType } from '@prisma/client'

interface NotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
  linkType?: string
  relatedId?: string
  relatedType?: string
}

export async function sendNotification(params: NotificationParams) {
  return prisma.notification.create({ data: params })
}

async function findTeamLeaders() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { roles: { some: { role: { name: 'SALES_MANAGER' } } } },
        { position: { contains: '팀장' } },
      ],
    },
    select: { id: true, name: true },
  })
}

async function findCEOs() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { roles: { some: { role: { name: 'ADMIN' } } } },
        { position: { in: ['CEO', '대표이사', '대표'] } },
        { role: 'CEO' },
      ],
    },
    select: { id: true, name: true },
  })
}

export async function notifyApprovalSubmitted(approval: {
  id: string
  approvalNumber: string
  clientCompany?: string | null
  createdById: string
}) {
  const teamLeaders = await findTeamLeaders()
  const creator = await prisma.user.findUnique({
    where: { id: approval.createdById },
    select: { name: true },
  })
  await Promise.all(
    teamLeaders.map((tl) =>
      sendNotification({
        userId: tl.id,
        type: 'APPROVAL_REQUEST',
        title: '품의서 결재 요청',
        message: `${creator?.name || ''}님이 품의서 ${approval.approvalNumber}${approval.clientCompany ? ` (${approval.clientCompany})` : ''}의 결재를 요청했습니다.`,
        linkUrl: `/sales/approvals/${approval.id}`,
        linkType: 'SALES_APPROVAL',
        relatedId: approval.id,
        relatedType: 'SalesApproval',
      })
    )
  )
}

export async function notifyTeamLeadSigned(approval: {
  id: string
  approvalNumber: string
  clientCompany?: string | null
}) {
  const ceos = await findCEOs()
  await Promise.all(
    ceos.map((ceo) =>
      sendNotification({
        userId: ceo.id,
        type: 'APPROVAL_REQUEST',
        title: '품의서 최종 결재 요청',
        message: `품의서 ${approval.approvalNumber}${approval.clientCompany ? ` (${approval.clientCompany})` : ''}이 팀장 승인 완료. 최종 결재를 기다리고 있습니다.`,
        linkUrl: `/sales/approvals/${approval.id}`,
        linkType: 'SALES_APPROVAL',
        relatedId: approval.id,
        relatedType: 'SalesApproval',
      })
    )
  )
}

export async function notifyApprovalApproved(approval: {
  id: string
  approvalNumber: string
  clientCompany?: string | null
  createdById: string
}) {
  await sendNotification({
    userId: approval.createdById,
    type: 'APPROVAL_APPROVED',
    title: '품의서 승인 완료',
    message: `품의서 ${approval.approvalNumber}${approval.clientCompany ? ` (${approval.clientCompany})` : ''}이 최종 승인되었습니다.`,
    linkUrl: `/sales/approvals/${approval.id}`,
    linkType: 'SALES_APPROVAL',
    relatedId: approval.id,
    relatedType: 'SalesApproval',
  })
}

export async function notifyApprovalRejected(approval: {
  id: string
  approvalNumber: string
  clientCompany?: string | null
  createdById: string
  rejectionReason?: string | null
}) {
  await sendNotification({
    userId: approval.createdById,
    type: 'APPROVAL_REJECTED',
    title: '품의서 반려',
    message: `품의서 ${approval.approvalNumber}${approval.clientCompany ? ` (${approval.clientCompany})` : ''}이 반려되었습니다.${approval.rejectionReason ? ` 사유: ${approval.rejectionReason}` : ''}`,
    linkUrl: `/sales/approvals/${approval.id}`,
    linkType: 'SALES_APPROVAL',
    relatedId: approval.id,
    relatedType: 'SalesApproval',
  })
}

export async function notifyApprovalWithdrawn(approval: {
  id: string
  approvalNumber: string
  clientCompany?: string | null
  createdById: string
  salesManagerId?: string | null
  teamLeaderId?: string | null
  ceoId?: string | null
}) {
  const creator = await prisma.user.findUnique({
    where: { id: approval.createdById },
    select: { name: true },
  })
  const signerIds = [approval.salesManagerId, approval.teamLeaderId, approval.ceoId]
  const unique = [...new Set(signerIds.filter((id): id is string => !!id && id !== approval.createdById))]
  await Promise.all(
    unique.map((userId) =>
      sendNotification({
        userId: userId!,
        type: 'SYSTEM',
        title: '품의서 회수',
        message: `${creator?.name || ''}님이 품의서 ${approval.approvalNumber}을 회수했습니다.`,
        linkUrl: `/sales/approvals/${approval.id}`,
        linkType: 'SALES_APPROVAL',
        relatedId: approval.id,
        relatedType: 'SalesApproval',
      })
    )
  )
}
