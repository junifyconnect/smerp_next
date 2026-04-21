/**
 * scripts/migrate-invoice-to-records.ts
 *
 * ⚠ DEPRECATED (2026-04-20)
 *
 * 계산서 근본 재설계(planning/08-invoice-redesign.md)로 인해 이 스크립트는 폐기되었습니다.
 *
 * 변경사항:
 *   - Product/Item의 legacy 계산서 상태 필드(salesInvoiceStatus, purchaseInvoiceStatus, ...)가 모두 제거됨
 *   - InvoiceRecord가 유일한 진실의 원천으로 확립됨
 *   - 매입 계산서 단위는 매입처(vendorCompany)로 통일, purchaseInvoiceUnit 제거
 *   - InvoiceRecord 식별 필드가 itemId → productId + salesItemId + vendorCompany로 재구성됨
 *
 * 이관 전략:
 *   - 기존 데이터는 DB 리셋으로 폐기 (사용자 승인 2026-04-20)
 *   - `npx prisma migrate reset` 또는 `npx prisma db push --force-reset`으로 신규 스키마 반영
 *   - 마이그레이션 이관 로직은 불필요
 *
 * 이 파일은 참조 이력을 위해 유지되지만 실행하면 에러를 발생시킵니다.
 */

console.error(
  '❌ DEPRECATED: 이 스크립트는 폐기되었습니다. planning/08-invoice-redesign.md 참조.\n' +
    '   기존 데이터는 DB 리셋 처리됩니다 (npx prisma migrate reset).'
)
process.exit(1)
