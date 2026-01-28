import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sales-approvals/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 품의서 조회 (아이템 포함) - 단순 복사 방식
    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      include: {
        deal: { select: { id: true, name: true, status: true } },
        salesManager: { select: { id: true, name: true, signatureUrl: true } },
        teamLeader: { select: { id: true, name: true, signatureUrl: true } },
        ceo: { select: { id: true, name: true, signatureUrl: true } },
        rejectedBy: { select: { id: true, name: true } },
        items: {
          include: { details: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        purchaseItems: {
          include: { details: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "품의서를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    return NextResponse.json(approval);
  } catch (error) {
    console.error("품의서 조회 오류:", error);
    return NextResponse.json(
      { error: "품의서 조회에 실패했습니다" },
      { status: 500 },
    );
  }
}

// PATCH /api/sales-approvals/[id] - 수정 (단순 복사 방식)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      approvalCode,
      approvalDate,
      managerName,
      clientCompany,
      clientContact,
      clientPhone,
      endUser,
      paymentTerms,
      deliveryAddress,
      deliveryDate,
      invoiceEmail,
      receiverName,
      receiverPhone,
      notes,
      status,
      items,
      purchaseItems,
    } = body;

    // 현재 품의서 존재 확인
    const currentApproval = await prisma.salesApproval.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!currentApproval) {
      return NextResponse.json(
        { error: "품의서를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (approvalCode !== undefined) updateData.approvalCode = approvalCode;
    if (approvalDate !== undefined)
      updateData.approvalDate = approvalDate ? new Date(approvalDate) : null;
    if (managerName !== undefined) updateData.managerName = managerName;
    if (clientCompany !== undefined) updateData.clientCompany = clientCompany;
    if (clientContact !== undefined) updateData.clientContact = clientContact;
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
    if (endUser !== undefined) updateData.endUser = endUser;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
    if (deliveryAddress !== undefined)
      updateData.deliveryAddress = deliveryAddress;
    if (deliveryDate !== undefined)
      updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    if (invoiceEmail !== undefined) updateData.invoiceEmail = invoiceEmail;
    if (receiverName !== undefined) updateData.receiverName = receiverName;
    if (receiverPhone !== undefined) updateData.receiverPhone = receiverPhone;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    // 생성된 매출 아이템 ID 맵 (인덱스 → { itemId, detailIds[] })
    const createdSalesItemsMap: { itemId: string; detailIds: string[] }[] = [];

    // 매출 아이템이 제공된 경우
    if (items !== undefined) {
      let totalAmount = 0;
      const itemsData = items.map(
        (
          item: {
            quantity?: number;
            unitPrice?: number;
            productName?: string;
            partNumber?: string;
            isConsolidated?: boolean;
            details?: {
              partNumber?: string;
              description?: string;
              quantity?: number;
              sortOrder?: number;
            }[];
            sortOrder?: number;
          },
          index: number,
        ) => {
          const qty = item.quantity || 1;
          const price = item.unitPrice || 0;
          const itemTotal = qty * price;
          totalAmount += itemTotal;
          const details = item.details || [];
          return {
            productName: item.productName || "제품",
            quantity: qty,
            unitPrice: price,
            totalPrice: itemTotal,
            sortOrder: item.sortOrder ?? index,
            isConsolidated: item.isConsolidated ?? details.length > 1,
            partNumber:
              item.partNumber ??
              (details.length === 1 ? details[0]?.partNumber : null),
            details,
          };
        },
      );

      const vatAmount = Math.round(totalAmount * 0.1);
      const totalWithVat = totalAmount + vatAmount;

      updateData.totalAmount = totalAmount;
      updateData.vatAmount = vatAmount;
      updateData.totalWithVat = totalWithVat;

      // 기존 아이템 삭제 (현재 품의서 ID 기준)
      await prisma.salesApprovalItem.deleteMany({
        where: { approvalId: id },
      });

      // 새 아이템 생성 및 ID 저장
      for (const item of itemsData) {
        const createdItem = await prisma.salesApprovalItem.create({
          data: {
            approvalId: id,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            sortOrder: item.sortOrder,
            isConsolidated: item.isConsolidated,
            partNumber: item.partNumber,
            details: {
              create: item.details.map(
                (
                  detail: {
                    partNumber?: string;
                    description?: string;
                    quantity?: number;
                    sortOrder?: number;
                  },
                  detailIndex: number,
                ) => ({
                  partNumber: detail.partNumber,
                  description: detail.description,
                  quantity: detail.quantity,
                  sortOrder: detail.sortOrder ?? detailIndex,
                }),
              ),
            },
          },
          include: {
            details: { orderBy: { sortOrder: "asc" } },
          },
        });

        createdSalesItemsMap.push({
          itemId: createdItem.id,
          detailIds: createdItem.details.map((d) => d.id),
        });
      }
    }

    // 매입 아이템이 제공된 경우
    if (purchaseItems !== undefined) {
      let purchaseTotal = 0;
      const purchaseItemsData = purchaseItems.map(
        (
          item: {
            quantity?: number;
            unitPrice?: number;
            productName?: string;
            isConsolidated?: boolean;
            details?: {
              partNumber?: string;
              description?: string;
              quantity?: number;
              sortOrder?: number;
            }[];
            purchaseDate?: string;
            vendorCompany?: string;
            sortOrder?: number;
            salesItemIndex?: number;
            salesItemDetailIndex?: number;  // 개별 매입 시 매출 품목 인덱스
          },
          index: number,
        ) => {
          const qty = item.quantity || 1;
          const price = item.unitPrice || 0;
          const details = item.details || [];
          const isConsolidated = item.isConsolidated ?? false;
          const itemTotal = qty * price;
          purchaseTotal += itemTotal;

          // salesItemId, salesItemDetailId 결정
          let salesItemId: string | null = null;
          let salesItemDetailId: string | null = null;

          if (
            item.salesItemIndex !== undefined &&
            createdSalesItemsMap[item.salesItemIndex]
          ) {
            const salesItemInfo = createdSalesItemsMap[item.salesItemIndex];
            salesItemId = salesItemInfo.itemId;

            // 개별 매입 시 salesItemDetailId 설정
            if (!isConsolidated && item.salesItemDetailIndex !== undefined) {
              salesItemDetailId = salesItemInfo.detailIds[item.salesItemDetailIndex] || null;
            }
          }

          return {
            productName: item.productName || "제품",
            quantity: qty,
            unitPrice: price,
            totalPrice: itemTotal,
            purchaseDate: item.purchaseDate
              ? new Date(item.purchaseDate)
              : null,
            vendorCompany: item.vendorCompany,
            sortOrder: item.sortOrder ?? index,
            isConsolidated,
            details,
            salesItemId,
            salesItemDetailId,
          };
        },
      );

      const purchaseTotalWithVat =
        purchaseTotal + Math.round(purchaseTotal * 0.1);

      updateData.purchaseTotal = purchaseTotal;
      updateData.purchaseTotalWithVat = purchaseTotalWithVat;

      // 기존 아이템 삭제 (현재 품의서 ID 기준)
      await prisma.salesApprovalPurchaseItem.deleteMany({
        where: { approvalId: id },
      });

      // 새 아이템 생성
      for (const item of purchaseItemsData) {
        await prisma.salesApprovalPurchaseItem.create({
          data: {
            approvalId: id,
            salesItemId: item.salesItemId,
            salesItemDetailId: item.salesItemDetailId,  // 개별 매입 시 매출 품목 연결
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            purchaseDate: item.purchaseDate,
            vendorCompany: item.vendorCompany,
            sortOrder: item.sortOrder,
            isConsolidated: item.isConsolidated,
            details: {
              create: item.details.map(
                (
                  detail: {
                    partNumber?: string;
                    description?: string;
                    quantity?: number;
                    sortOrder?: number;
                  },
                  detailIndex: number,
                ) => ({
                  partNumber: detail.partNumber,
                  description: detail.description,
                  quantity: detail.quantity,
                  sortOrder: detail.sortOrder ?? detailIndex,
                }),
              ),
            },
          },
        });
      }
    }

    // 품의서 업데이트 및 결과 반환
    const updatedApproval = await prisma.salesApproval.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: { details: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        purchaseItems: {
          include: { details: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(updatedApproval);
  } catch (error) {
    console.error("품의서 수정 오류:", error);
    return NextResponse.json(
      { error: "품의서 수정에 실패했습니다" },
      { status: 500 },
    );
  }
}

// DELETE /api/sales-approvals/[id] - 삭제 (단순 복사 방식)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 삭제할 품의서 정보 조회
    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        version: true,
        originalId: true,
        isLatest: true,
        approvalCode: true,
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "품의서를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const chainRootId = approval.originalId || approval.id;
    const currentVersion = approval.version || 1;

    // 트랜잭션으로 처리
    await prisma.$transaction(async (tx) => {
      // 1. 이전 버전 찾기 (같은 체인에서 version - 1)
      if (currentVersion > 1 && approval.isLatest) {
        const previousVersion = await tx.salesApproval.findFirst({
          where: {
            OR: [
              { id: chainRootId, version: currentVersion - 1 },
              { originalId: chainRootId, version: currentVersion - 1 },
            ],
          },
        });

        if (previousVersion) {
          // 이전 버전을 최신으로 변경
          await tx.salesApproval.update({
            where: { id: previousVersion.id },
            data: { isLatest: true },
          });
        }
      }

      // 2. 현재 품의서의 아이템들 삭제 (단순 복사 방식: approvalId = 현재 품의서 ID)
      await tx.salesApprovalItem.deleteMany({
        where: { approvalId: id },
      });

      await tx.salesApprovalPurchaseItem.deleteMany({
        where: { approvalId: id },
      });

      // 3. 해당 품의서의 InvoiceRecord 삭제 (PENDING 상태만)
      // 실제 발행된 기록(ISSUED)은 유지
      await tx.invoiceRecord.deleteMany({
        where: {
          approvalId: id,
          status: "PENDING",
        },
      });

      // 4. 품의서 삭제
      await tx.salesApproval.delete({ where: { id } });
    });

    const message =
      currentVersion > 1
        ? `버전 ${currentVersion}이 삭제되고 이전 버전으로 복원되었습니다`
        : "삭제되었습니다";

    return NextResponse.json({ message });
  } catch (error) {
    console.error("품의서 삭제 오류:", error);
    return NextResponse.json(
      { error: "품의서 삭제에 실패했습니다" },
      { status: 500 },
    );
  }
}
