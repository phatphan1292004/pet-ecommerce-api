import "dotenv/config";
import { AppDataSource } from "@/app/database";
import {
  AdminDiscountProgramService,
  AdminCreateDiscountProgramPayload,
} from "@/app/features/admin/discount-programs/DiscountProgramService";

const payload: AdminCreateDiscountProgramPayload = {
  name: "Summer Sale",
  code: "SUMMER2026",
  discountType: "PERCENT",
  discountValue: 10,
  startDate: "2026-06-01T00:00:00.000Z",
  endDate: "2026-06-30T23:59:59.000Z",
  isActive: true,
  description: "Giam gia thang 6",
  productIds: ["69b56c3d7b7834a8552efaf4"],
};

const createProgram = async (): Promise<void> => {
  await AppDataSource.initialize();
  const service = new AdminDiscountProgramService();

  const program = await service.createProgram(payload);
  console.log("Created discount program:", program);

  await AppDataSource.destroy();
};

createProgram().catch(async (error) => {
  console.error("Create discount program failed:", error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
