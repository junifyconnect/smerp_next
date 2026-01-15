/**
 * 알림 규칙 설정 파일
 *
 * 모든 알림 조건을 이 파일에서 중앙 관리합니다.
 * 새로운 알림을 추가하거나 수정할 때 이 파일만 수정하면 됩니다.
 */

import { NotificationType } from '@prisma/client'

// ============================================
// 타입 정의
// ============================================

export type NotificationRuleId =
  | 'ma_expiring_30'
  | 'ma_expiring_7'
  | 'ma_expired'
  | 'payment_due_7'
  | 'payment_due_3'
  | 'payment_overdue'
  | 'approval_request'
  | 'approval_approved'
  | 'approval_rejected'

export interface NotificationRule {
  id: NotificationRuleId
  name: string                    // 규칙 이름 (관리용)
  description: string             // 규칙 설명
  type: NotificationType          // 알림 타입 (Prisma enum)
  enabled: boolean                // 활성화 여부

  // 조건 설정
  condition: {
    daysBeforeExpiry?: number     // 만료 N일 전
    daysBeforeDue?: number        // 결제일 N일 전
    daysAfterDue?: number         // 결제일 N일 후 (연체)
    triggerOn?: 'create' | 'update' | 'status_change'  // 즉시 발송 트리거
  }

  // 메시지 템플릿 (변수: {변수명} 형식)
  template: {
    title: string
    message: string
  }

  // 링크 설정
  link?: {
    type: string                  // 링크 타입 (ma, approval, invoice 등)
    urlPattern: string            // URL 패턴 (예: /ma/{id})
  }
}

// ============================================
// 알림 규칙 정의
// ============================================

export const notificationRules: NotificationRule[] = [
  // ----------------------------------------
  // MA 관련 알림
  // ----------------------------------------
  {
    id: 'ma_expiring_30',
    name: 'MA 만료 30일 전 알림',
    description: 'MA 계약 만료 30일 전에 담당자에게 알림',
    type: 'MA_EXPIRING',
    enabled: true,
    condition: {
      daysBeforeExpiry: 30,
    },
    template: {
      title: 'MA 계약 만료 예정 (30일 전)',
      message: '{customerName}의 MA 계약이 30일 후 만료됩니다. 갱신 여부를 확인해주세요.',
    },
    link: {
      type: 'ma',
      urlPattern: '/ma/{id}',
    },
  },
  {
    id: 'ma_expiring_7',
    name: 'MA 만료 7일 전 알림',
    description: 'MA 계약 만료 7일 전에 담당자에게 긴급 알림',
    type: 'MA_EXPIRING',
    enabled: true,
    condition: {
      daysBeforeExpiry: 7,
    },
    template: {
      title: 'MA 계약 만료 임박 (7일 전)',
      message: '{customerName}의 MA 계약이 7일 후 만료됩니다. 긴급 확인이 필요합니다.',
    },
    link: {
      type: 'ma',
      urlPattern: '/ma/{id}',
    },
  },
  {
    id: 'ma_expired',
    name: 'MA 만료됨 알림',
    description: 'MA 계약이 만료된 경우 담당자에게 알림',
    type: 'MA_EXPIRING',
    enabled: true,
    condition: {
      daysBeforeExpiry: 0,
    },
    template: {
      title: 'MA 계약 만료',
      message: '{customerName}의 MA 계약이 만료되었습니다.',
    },
    link: {
      type: 'ma',
      urlPattern: '/ma/{id}',
    },
  },

  // ----------------------------------------
  // 결제 관련 알림
  // ----------------------------------------
  {
    id: 'payment_due_7',
    name: '결제일 7일 전 알림',
    description: '결제 예정일 7일 전에 담당자에게 알림',
    type: 'PAYMENT_DUE',
    enabled: true,
    condition: {
      daysBeforeDue: 7,
    },
    template: {
      title: '결제 예정 (7일 전)',
      message: '{customerName} 건의 결제일이 7일 남았습니다. 금액: {amount}원',
    },
    link: {
      type: 'invoice',
      urlPattern: '/management/invoice-status?id={id}',
    },
  },
  {
    id: 'payment_due_3',
    name: '결제일 3일 전 알림',
    description: '결제 예정일 3일 전에 담당자에게 알림',
    type: 'PAYMENT_DUE',
    enabled: true,
    condition: {
      daysBeforeDue: 3,
    },
    template: {
      title: '결제 예정 (3일 전)',
      message: '{customerName} 건의 결제일이 3일 남았습니다. 금액: {amount}원',
    },
    link: {
      type: 'invoice',
      urlPattern: '/management/invoice-status?id={id}',
    },
  },
  {
    id: 'payment_overdue',
    name: '결제 연체 알림',
    description: '결제일이 지난 경우 담당자에게 알림',
    type: 'PAYMENT_DUE',
    enabled: true,
    condition: {
      daysAfterDue: 1,
    },
    template: {
      title: '결제 연체',
      message: '{customerName} 건의 결제가 연체되었습니다. 금액: {amount}원',
    },
    link: {
      type: 'invoice',
      urlPattern: '/management/invoice-status?id={id}',
    },
  },

  // ----------------------------------------
  // 결재 관련 알림 (즉시 발송)
  // ----------------------------------------
  {
    id: 'approval_request',
    name: '결재 요청 알림',
    description: '새로운 결재 요청이 생성되면 결재자에게 알림',
    type: 'APPROVAL_REQUEST',
    enabled: true,
    condition: {
      triggerOn: 'create',
    },
    template: {
      title: '결재 요청',
      message: '{requesterName}님이 {documentType} 결재를 요청했습니다.',
    },
    link: {
      type: 'approval',
      urlPattern: '/approvals/{id}',
    },
  },
  {
    id: 'approval_approved',
    name: '결재 승인 알림',
    description: '결재가 승인되면 요청자에게 알림',
    type: 'APPROVAL_APPROVED',
    enabled: true,
    condition: {
      triggerOn: 'status_change',
    },
    template: {
      title: '결재 승인',
      message: '{documentType}이(가) {approverName}님에 의해 승인되었습니다.',
    },
    link: {
      type: 'approval',
      urlPattern: '/approvals/{id}',
    },
  },
  {
    id: 'approval_rejected',
    name: '결재 반려 알림',
    description: '결재가 반려되면 요청자에게 알림',
    type: 'APPROVAL_REJECTED',
    enabled: true,
    condition: {
      triggerOn: 'status_change',
    },
    template: {
      title: '결재 반려',
      message: '{documentType}이(가) {approverName}님에 의해 반려되었습니다. 사유: {reason}',
    },
    link: {
      type: 'approval',
      urlPattern: '/approvals/{id}',
    },
  },
]

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 활성화된 규칙만 가져오기
 */
export function getEnabledRules(): NotificationRule[] {
  return notificationRules.filter(rule => rule.enabled)
}

/**
 * 규칙 ID로 규칙 찾기
 */
export function getRuleById(id: NotificationRuleId): NotificationRule | undefined {
  return notificationRules.find(rule => rule.id === id)
}

/**
 * 타입별 규칙 가져오기
 */
export function getRulesByType(type: NotificationType): NotificationRule[] {
  return notificationRules.filter(rule => rule.type === type && rule.enabled)
}

/**
 * 스케줄 기반 규칙 가져오기 (cron job에서 사용)
 */
export function getScheduledRules(): NotificationRule[] {
  return notificationRules.filter(rule =>
    rule.enabled &&
    (rule.condition.daysBeforeExpiry !== undefined ||
     rule.condition.daysBeforeDue !== undefined ||
     rule.condition.daysAfterDue !== undefined)
  )
}

/**
 * 즉시 발송 규칙 가져오기 (이벤트 발생 시 사용)
 */
export function getImmediateRules(): NotificationRule[] {
  return notificationRules.filter(rule =>
    rule.enabled && rule.condition.triggerOn !== undefined
  )
}

/**
 * 템플릿 변수 치환
 */
export function renderTemplate(
  template: { title: string; message: string },
  variables: Record<string, string | number>
): { title: string; message: string } {
  let title = template.title
  let message = template.message

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`
    title = title.replace(new RegExp(placeholder, 'g'), String(value))
    message = message.replace(new RegExp(placeholder, 'g'), String(value))
  }

  return { title, message }
}

/**
 * URL 패턴 변수 치환
 */
export function renderUrl(urlPattern: string, variables: Record<string, string>): string {
  let url = urlPattern
  for (const [key, value] of Object.entries(variables)) {
    url = url.replace(`{${key}}`, value)
  }
  return url
}
