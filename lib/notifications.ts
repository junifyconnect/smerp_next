import prisma from '@/lib/db'
import { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
  linkType?: string
  relatedId?: string
  relatedType?: string
}

// 단일 알림 생성
export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: params,
  })
}

// 여러 사용자에게 알림 생성
export async function createNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      ...params,
    })),
  })
}

// 결재 요청 알림
export async function notifyApprovalRequest({
  approvalId,
  approvalNumber,
  approvalType, // 'SALES' | 'MA'
  targetUserId,
  requesterName,
}: {
  approvalId: string
  approvalNumber: string
  approvalType: 'SALES' | 'MA'
  targetUserId: string
  requesterName: string
}) {
  const typeLabel = approvalType === 'SALES' ? '영업 품의서' : 'MA 품의서'
  const linkUrl =
    approvalType === 'SALES'
      ? `/sales/approvals/${approvalId}`
      : `/ma/approvals/${approvalId}`

  return createNotification({
    userId: targetUserId,
    type: 'APPROVAL_REQUEST',
    title: '결재 요청',
    message: `${requesterName}님이 ${typeLabel} ${approvalNumber}의 결재를 요청했습니다.`,
    linkUrl,
    linkType: approvalType === 'SALES' ? 'SALES_APPROVAL' : 'MA_APPROVAL',
    relatedId: approvalId,
    relatedType: approvalType === 'SALES' ? 'SalesApproval' : 'MAApproval',
  })
}

// 결재 승인 알림
export async function notifyApprovalApproved({
  approvalId,
  approvalNumber,
  approvalType,
  targetUserId,
  approverName,
}: {
  approvalId: string
  approvalNumber: string
  approvalType: 'SALES' | 'MA'
  targetUserId: string
  approverName: string
}) {
  const typeLabel = approvalType === 'SALES' ? '영업 품의서' : 'MA 품의서'
  const linkUrl =
    approvalType === 'SALES'
      ? `/sales/approvals/${approvalId}`
      : `/ma/approvals/${approvalId}`

  return createNotification({
    userId: targetUserId,
    type: 'APPROVAL_APPROVED',
    title: '결재 승인',
    message: `${approverName}님이 ${typeLabel} ${approvalNumber}을(를) 승인했습니다.`,
    linkUrl,
    linkType: approvalType === 'SALES' ? 'SALES_APPROVAL' : 'MA_APPROVAL',
    relatedId: approvalId,
    relatedType: approvalType === 'SALES' ? 'SalesApproval' : 'MAApproval',
  })
}

// 결재 반려 알림
export async function notifyApprovalRejected({
  approvalId,
  approvalNumber,
  approvalType,
  targetUserId,
  rejectorName,
  reason,
}: {
  approvalId: string
  approvalNumber: string
  approvalType: 'SALES' | 'MA'
  targetUserId: string
  rejectorName: string
  reason?: string
}) {
  const typeLabel = approvalType === 'SALES' ? '영업 품의서' : 'MA 품의서'
  const linkUrl =
    approvalType === 'SALES'
      ? `/sales/approvals/${approvalId}`
      : `/ma/approvals/${approvalId}`

  return createNotification({
    userId: targetUserId,
    type: 'APPROVAL_REJECTED',
    title: '결재 반려',
    message: `${rejectorName}님이 ${typeLabel} ${approvalNumber}을(를) 반려했습니다.${reason ? ` 사유: ${reason}` : ''}`,
    linkUrl,
    linkType: approvalType === 'SALES' ? 'SALES_APPROVAL' : 'MA_APPROVAL',
    relatedId: approvalId,
    relatedType: approvalType === 'SALES' ? 'SalesApproval' : 'MAApproval',
  })
}

// MA 만료 예정 알림
export async function notifyMAExpiring({
  maApprovalId,
  customerName,
  endDate,
  targetUserId,
  daysRemaining,
}: {
  maApprovalId: string
  customerName: string
  endDate: Date
  targetUserId: string
  daysRemaining: number
}) {
  const dateStr = endDate.toLocaleDateString('ko-KR')

  return createNotification({
    userId: targetUserId,
    type: 'MA_EXPIRING',
    title: 'MA 계약 만료 예정',
    message: `${customerName} MA 계약이 ${daysRemaining}일 후(${dateStr}) 만료됩니다.`,
    linkUrl: `/ma/approvals/${maApprovalId}`,
    linkType: 'MA_APPROVAL',
    relatedId: maApprovalId,
    relatedType: 'MAApproval',
  })
}

// 결제 예정 알림
export async function notifyPaymentDue({
  invoiceId,
  invoiceType, // 'SALES' | 'PURCHASE'
  companyName,
  amount,
  dueDate,
  targetUserId,
}: {
  invoiceId: string
  invoiceType: 'SALES' | 'PURCHASE'
  companyName: string
  amount: number
  dueDate: Date
  targetUserId: string
}) {
  const typeLabel = invoiceType === 'SALES' ? '매출' : '매입'
  const dateStr = dueDate.toLocaleDateString('ko-KR')
  const amountStr = amount.toLocaleString('ko-KR')

  return createNotification({
    userId: targetUserId,
    type: 'PAYMENT_DUE',
    title: `${typeLabel} 결제 예정`,
    message: `${companyName} ${typeLabel} ${amountStr}원 결제 예정일: ${dateStr}`,
    linkUrl:
      invoiceType === 'SALES'
        ? `/management/sales-invoice-status`
        : `/management/purchase-invoice-status`,
    linkType: invoiceType === 'SALES' ? 'SALES_INVOICE' : 'PURCHASE_INVOICE',
    relatedId: invoiceId,
    relatedType:
      invoiceType === 'SALES' ? 'SalesInvoiceStatus' : 'PurchaseInvoiceStatus',
  })
}
