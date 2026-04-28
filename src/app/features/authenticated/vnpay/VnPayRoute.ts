import express, { Request, Response } from "express";
import {
  createPayment,
  verifyPayment,
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

export default router;
