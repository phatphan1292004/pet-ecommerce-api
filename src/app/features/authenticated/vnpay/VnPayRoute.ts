import express, { Request, Response } from "express";
import { AppDataSource } from '@/app/database';
import { Order } from '@/app/entities/Order';
import { ObjectId } from 'mongodb';
import {
  createPayment,
  verifyPayment,
  verifyIPN,
  CreatePaymentRequest,
} from "./VnPayService";

const router = express.Router();

router.post("/create_payment", (req: Request, res: Response) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res
        .status(400)
        .json({ message: "amount and orderId are required" });
    }

    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "invalid amount" });
    }

    const paymentData: CreatePaymentRequest = { amount: amountNum, orderId };
    const result = createPayment(req, paymentData);

    return res.json(result);
  } catch (error) {
    console.error("VnPay create_payment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/payment_return", (req: Request, res: Response) => {
  try {
    const result = verifyPayment(req);

    if (!result.isValid) {
      return res.status(400).json({
        message: "Sai chữ ký",
      });
    }

    const isSuccess = result.responseCode === "00";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (isSuccess) {
      return res.redirect(
        `${frontendUrl}/cart/payment/vnpay-return?status=success&orderId=${result.orderId}`,
      );
    } else {
      return res.redirect(
        `${frontendUrl}/cart/payment/vnpay-return?status=fail&code=${result.responseCode}`,
      );
    }
  } catch (error) {
    console.error("VnPay payment_return error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post('/payment_ipn', async (req: Request, res: Response) => {
  try {
    const result = verifyIPN(req);

    if (!result.isValid) {
      // VnPay expects a plain response indicating failure; keep it simple
      return res.status(400).send('INVALID_SIGNATURE');
    }

    const isSuccess = result.responseCode === '00';
    const orderId = result.orderId;

    if (!orderId) {
      return res.status(400).send('MISSING_ORDER');
    }

    try {
      const orderRepo = AppDataSource.getMongoRepository(Order);
      let orderObjectId: ObjectId | null = null;
      try {
        orderObjectId = new ObjectId(orderId);
      } catch {
        orderObjectId = null;
      }

      const where = orderObjectId ? { _id: orderObjectId } : { _id: orderId } as any;
      const order = await orderRepo.findOne({ where } as any);

      if (order) {
        if (isSuccess) {
          order.isPaid = true;
          // use 'close' as completed status as used elsewhere in admin/dashboard
          order.status = 'confirmed';
        }
        await orderRepo.save(order);
      }
    } catch (err) {
      console.error('VnPay IPN update order error:', err);
    }
    return res.send('OK');
  } catch (error) {
    console.error('VnPay payment_ipn error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
