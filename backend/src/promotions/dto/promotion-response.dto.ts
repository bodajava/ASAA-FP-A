export interface PromotionResponseDto {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  productId: string | null;
  customerId: string | null;
  discountPct: number | null;
  discountAmt: number | null;
  startDate: Date;
  endDate: Date | null;
  budgetAmt: number;
  actualCost: number;
  incrementalRevenue: number;
  roi: number | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  product: { id: string; name: string } | null;
  customer: { id: string; name: string } | null;
  creator: { id: string; name: string } | null;
}
