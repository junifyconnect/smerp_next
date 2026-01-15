/**
 * 알림 서비스
 *
 * 알림 규칙을 기반으로 알림을 생성하고 발송합니다.
 * - 스케줄 기반: cron job에서 호출 (MA 만료, 결제일 등)
 * - 이벤트 기반: 특정 액션 발생 시 호출 (결재 요청/승인 등)
 */

import prisma from '@/lib/db'
import {
  getScheduledRules,
  getRuleById,
  renderTemplate,
  renderUrl,
  NotificationRuleId,
  NotificationRule,
} from './notification-rules'

// ============================================
// 이벤트 기반 알림 (즉시 발송)
// ============================================

interface ApprovalNotificationParams {
  approvalId: string
  documentType: string       // 품의서, 견적서 등
  requesterName: string
  requesterId: string
  approverIds: string[]      // 결재자 ID 목록
}

/**
 * 결재 요청 알림 발송
 */
export async function sendApprovalRequestNotification(params: ApprovalNotificationParams) {
  const rule = getRuleById('approval_request')
  if (!rule || !rule.enabled) return

  const { title, message } = renderTemplate(rule.template, {
    documentType: params.documentType,
    requesterName: params.requesterName,
  })

  const linkUrl = rule.link ? renderUrl(rule.link.urlPattern, { id: params.approvalId }) : undefined

  // 모든 결재자에게 알림 생성
  await prisma.notification.createMany({
    data: params.approverIds.map(userId => ({
      userId,
      type: rule.type,
      title,
      message,
      linkUrl,
      linkType: rule.link?.type,
      relatedId: params.approvalId,
      relatedType: 'approval',
    })),
  })
}

interface ApprovalStatusParams {
  approvalId: string
  documentType: string
  requesterId: string        // 알림 받을 사람 (요청자)
  approverName: string
  reason?: string            // 반려 사유
}

/**
 * 결재 승인 알림 발송
 */
export async function sendApprovalApprovedNotification(params: ApprovalStatusParams) {
  const rule = getRuleById('approval_approved')
  if (!rule || !rule.enabled) return

  const { title, message } = renderTemplate(rule.template, {
    documentType: params.documentType,
    approverName: params.approverName,
  })

  const linkUrl = rule.link ? renderUrl(rule.link.urlPattern, { id: params.approvalId }) : undefined

  await prisma.notification.create({
    data: {
      userId: params.requesterId,
      type: rule.type,
      title,
      message,
      linkUrl,
      linkType: rule.link?.type,
      relatedId: params.approvalId,
      relatedType: 'approval',
    },
  })
}

/**
 * 결재 반려 알림 발송
 */
export async function sendApprovalRejectedNotification(params: ApprovalStatusParams) {
  const rule = getRuleById('approval_rejected')
  if (!rule || !rule.enabled) return

  const { title, message } = renderTemplate(rule.template, {
    documentType: params.documentType,
    approverName: params.approverName,
    reason: params.reason || '사유 없음',
  })

  const linkUrl = rule.link ? renderUrl(rule.link.urlPattern, { id: params.approvalId }) : undefined

  await prisma.notification.create({
    data: {
      userId: params.requesterId,
      type: rule.type,
      title,
      message,
      linkUrl,
      linkType: rule.link?.type,
      relatedId: params.approvalId,
      relatedType: 'approval',
    },
  })
}

// ============================================
// 스케줄 기반 알림 (Cron Job에서 호출)
// ============================================

/**
 * MA 만료 알림 체크 및 발송
 * - cron job에서 매일 실행
 */
export async function checkAndSendMAExpiringNotifications() {
  const rules = getScheduledRules().filter(r => r.type === 'MA_EXPIRING')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const rule of rules) {
    if (rule.condition.daysBeforeExpiry === undefined) continue

    // 만료일 계산
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() + rule.condition.daysBeforeExpiry)

    // 해당 만료일에 해당하는 MA 계약 조회
    // TODO: MA 모델 구조에 맞게 수정 필요
    const maContracts = await prisma.mAContract.findMany({
      where: {
        endDate: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
        status: 'ACTIVE',
      },
      include: {
        manager: true, // 담당자 정보
      },
    })

    for (const ma of maContracts) {
      if (!ma.managerId) continue

      // 이미 같은 알림이 있는지 확인 (중복 방지)
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: ma.managerId,
          relatedId: ma.id,
          relatedType: 'ma',
          type: rule.type,
          createdAt: {
            gte: today,
          },
        },
      })

      if (existingNotification) continue

      const { title, message } = renderTemplate(rule.template, {
        customerName: ma.customerName || '고객사',
      })

      const linkUrl = rule.link ? renderUrl(rule.link.urlPattern, { id: ma.id }) : undefined

      await prisma.notification.create({
        data: {
          userId: ma.managerId,
          type: rule.type,
          title,
          message,
          linkUrl,
          linkType: rule.link?.type,
          relatedId: ma.id,
          relatedType: 'ma',
        },
      })
    }
  }
}

/**
 * 결제일 알림 체크 및 발송
 * - cron job에서 매일 실행
 */
export async function checkAndSendPaymentDueNotifications() {
  const rules = getScheduledRules().filter(r => r.type === 'PAYMENT_DUE')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const rule of rules) {
    let targetDate: Date

    if (rule.condition.daysBeforeDue !== undefined) {
      // N일 전
      targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + rule.condition.daysBeforeDue)
    } else if (rule.condition.daysAfterDue !== undefined) {
      // N일 후 (연체)
      targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() - rule.condition.daysAfterDue)
    } else {
      continue
    }

    // 해당 결제일에 해당하는 미결제 건 조회
    // TODO: 실제 계산서/결제 모델 구조에 맞게 수정 필요
    const invoices = await prisma.salesInvoiceStatus.findMany({
      where: {
        paymentDueDate: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
        isPaid: false,
      },
      include: {
        manager: true,
      },
    })

    for (const invoice of invoices) {
      if (!invoice.managerId) continue

      // 중복 방지
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: invoice.managerId,
          relatedId: invoice.id,
          relatedType: 'invoice',
          type: rule.type,
          createdAt: {
            gte: today,
          },
        },
      })

      if (existingNotification) continue

      const { title, message } = renderTemplate(rule.template, {
        customerName: invoice.customerName || '고객사',
        amount: invoice.totalAmount?.toLocaleString() || '0',
      })

      const linkUrl = rule.link ? renderUrl(rule.link.urlPattern, { id: invoice.id }) : undefined

      await prisma.notification.create({
        data: {
          userId: invoice.managerId,
          type: rule.type,
          title,
          message,
          linkUrl,
          linkType: rule.link?.type,
          relatedId: invoice.id,
          relatedType: 'invoice',
        },
      })
    }
  }
}

/**
 * 모든 스케줄 기반 알림 체크
 * - 단일 cron job에서 이 함수만 호출하면 됨
 */
export async function runScheduledNotificationChecks() {
  console.log('[Notification] 스케줄 알림 체크 시작:', new Date().toISOString())

  try {
    await checkAndSendMAExpiringNotifications()
    console.log('[Notification] MA 만료 알림 체크 완료')
  } catch (error) {
    console.error('[Notification] MA 알림 체크 오류:', error)
  }

  try {
    await checkAndSendPaymentDueNotifications()
    console.log('[Notification] 결제일 알림 체크 완료')
  } catch (error) {
    console.error('[Notification] 결제일 알림 체크 오류:', error)
  }

  console.log('[Notification] 스케줄 알림 체크 완료:', new Date().toISOString())
}

// ============================================
// 수동 알림 발송 (관리자용)
// ============================================

interface ManualNotificationParams {
  userIds: string[]
  ruleId?: NotificationRuleId   // 규칙 사용 시
  title?: string                // 직접 지정 시
  message?: string
  linkUrl?: string
  variables?: Record<string, string | number>
}

/**
 * 수동 알림 발송 (관리자용)
 */
export async function sendManualNotification(params: ManualNotificationParams) {
  let title: string
  let message: string
  let linkUrl = params.linkUrl

  if (params.ruleId) {
    const rule = getRuleById(params.ruleId)
    if (!rule) throw new Error(`규칙을 찾을 수 없습니다: ${params.ruleId}`)

    const rendered = renderTemplate(rule.template, params.variables || {})
    title = rendered.title
    message = rendered.message

    if (rule.link && params.variables?.id) {
      linkUrl = renderUrl(rule.link.urlPattern, { id: String(params.variables.id) })
    }
  } else {
    if (!params.title || !params.message) {
      throw new Error('title과 message는 필수입니다')
    }
    title = params.title
    message = params.message
  }

  await prisma.notification.createMany({
    data: params.userIds.map(userId => ({
      userId,
      type: 'SYSTEM',
      title,
      message,
      linkUrl,
    })),
  })
}
