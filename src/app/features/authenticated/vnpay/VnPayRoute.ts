import express, { Request, Response } from "express";
import crypto from "crypto";
import qs from "qs";
import { ObjectId } from "mongodb";
import { AppDataSource } from "@/app/database";
import { Cart } from "@/app/entities/Cart";
import { Order } from "@/app/entities/Order";

const router = express.Router();
const orderRepo = AppDataSource.getMongoRepository(Order);
const cartRepo = AppDataSource.getMongoRepository(Cart);

const formatDate = (date: Date) =>
  new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);

const getClientIp = (req: Request) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    req.ip ||
    "127.0.0.1";

  return ip.replace(/^::ffff:/, "").replace("::1", "127.0.0.1");
};

const sortParams = (params: Record<string, any>) => {
  return Object.keys(params)
    .sort()
    .reduce((acc: any, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        acc[key] = encodeURIComponent(params[key]).replace(/%20/g, "+");
      }
      return acc;
    }, {});
};

const sign = (params: Record<string, any>, secret: string) => {
  const query = qs.stringify(sortParams(params), { encode: false });
  return crypto.createHmac("sha512", secret).update(query).digest("hex");
};

const parseQueryParams = (query: Request["query"]): Record<string, string> => {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      if (value[0] !== undefined) {
        normalized[key] = String(value[0]);
      }
      continue;
    }

    if (value !== undefined) {
      normalized[key] = String(value);
    }
  }

  return normalized;
};

const toObjectId = (value?: string): ObjectId | null => {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new ObjectId(value.trim());
  } catch {
    return null;
  }
};

const getOrderAmountInVnpUnit = async (order: Order): Promise<number | null> => {
  const cartObjectId = toObjectId(order.cartId);
  if (!cartObjectId) {
    return null;
  }

  const cart = await cartRepo.findOne({
    where: { _id: cartObjectId },
  });

  if (!cart || typeof cart.finalPrice !== "number") {
    return null;
  }

  return Math.round(cart.finalPrice * 100);
};

const ipnResponse = (RspCode: string, Message: string) => ({ RspCode, Message });


// ================= CREATE PAYMENT =================
router.post("/create_payment", (req: Request, res: Response) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({ message: "Missing data" });
    }

    const tmnCode = process.env.VNP_TMNCODE!;
    const secretKey = process.env.VNP_HASHSECRET!;
    const returnUrl = process.env.VNP_RETURN_URL!;
    const ipnUrl = process.env.VNP_IPN_URL;

    if (!ipnUrl) {
      return res.status(500).json({ message: "Missing VNP_IPN_URL" });
    }

    const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: Number(amount) * 100,
      vnp_CreateDate: formatDate(new Date()),
      vnp_CurrCode: "VND",
      vnp_IpAddr: getClientIp(req),
      vnp_Locale: "vn",
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: "other",
      vnp_IpnUrl: ipnUrl,
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: String(orderId),
    };

    const secureHash = sign(params, secretKey);

    const paymentUrl =
      vnpUrl +
      "?" +
      qs.stringify(
        {
          ...sortParams(params),
          vnp_SecureHash: secureHash,
        },
        { encode: false }
      );

    return res.json({ paymentUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error" });
  }
});


// ================= PAYMENT IPN =================
router.get("/payment_ipn", async (req: Request, res: Response) => {
  try {
    const secretKey = process.env.VNP_HASHSECRET;

    if (!secretKey) {
      return res.status(200).json(ipnResponse("99", "Config error"));
    }

    const params = parseQueryParams(req.query);
    const secureHash = params.vnp_SecureHash;

    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const signed = sign(params, secretKey);
    const isValidSignature = String(secureHash || "").toLowerCase() === signed.toLowerCase();

    if (!isValidSignature) {
      return res.status(200).json(ipnResponse("97", "Invalid signature"));
    }

    const txnRef = params.vnp_TxnRef;
    const orderObjectId = toObjectId(txnRef);
    if (!orderObjectId) {
      return res.status(200).json(ipnResponse("01", "Order not found"));
    }

    const order = await orderRepo.findOne({
      where: { _id: orderObjectId },
    });

    if (!order) {
      return res.status(200).json(ipnResponse("01", "Order not found"));
    }

    const expectedAmount = await getOrderAmountInVnpUnit(order);
    const paidAmount = Number(params.vnp_Amount);
    if (expectedAmount === null || !Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
      return res.status(200).json(ipnResponse("04", "Invalid amount"));
    }

    if (order.isPaid) {
      return res.status(200).json(ipnResponse("02", "Order already confirmed"));
    }

    const transactionStatus = params.vnp_TransactionStatus || params.vnp_ResponseCode;
    const isSuccess = params.vnp_ResponseCode === "00" && transactionStatus === "00";

    if (isSuccess) {
      order.isPaid = true;
      order.status = "confirmed";
      await orderRepo.save(order);
    }

    return res.status(200).json(ipnResponse("00", "Confirm Success"));
  } catch (err) {
    console.error("payment_ipn error", err);
    return res.status(200).json(ipnResponse("99", "Unknown error"));
  }
});


// ================= PAYMENT RETURN =================
router.get("/payment_return", (req: Request, res: Response) => {
  try {
    const secretKey = process.env.VNP_HASHSECRET!;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const params = parseQueryParams(req.query);

    const secureHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const isValid = String(secureHash || "").toLowerCase() === sign(params, secretKey).toLowerCase();

    if (!isValid) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const isSuccess = params.vnp_ResponseCode === "00";

    if (isSuccess) {
      return res.redirect(
        `${frontendUrl}/cart/payment/vnpay-return?status=success&orderId=${params.vnp_TxnRef}&amount=${params.vnp_Amount}&transactionNo=${params.vnp_TransactionNo}`
      );
    }

    return res.redirect(
      `${frontendUrl}/cart/payment/vnpay-return?status=fail&code=${params.vnp_ResponseCode}`
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error" });
  }
});

export default router;