import express, { Request, Response } from 'express';
import * as crypto from 'crypto';
import qs from 'qs';

const router = express.Router();

router.post('/create_payment', (req: Request, res: Response) => {
  try {
    const { amount, orderId } = req.body;
    if (!amount || !orderId) {
      return res.status(400).json({ message: 'amount and orderId are required' });
    }

    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'invalid amount' });
    }

    const tmnCode = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    const returnUrl = process.env.VNP_RETURN_URL;
    const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!tmnCode || !secretKey) {
      return res.status(500).json({ message: 'VnPay configuration missing' });
    }

    const date = new Date();
    const createDate = date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

    const vnp_Params: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: amountNum * 100,
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: req.ip,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: orderId,
    };

    const sorted = Object.fromEntries(Object.entries(vnp_Params).sort());
    const signData = qs.stringify(sorted, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    (sorted as any).vnp_SecureHash = signed;

    const paymentUrl = `${vnpUrl}?${qs.stringify(sorted, { encode: false })}`;

    return res.json({ paymentUrl });
  } catch (error) {
    console.error('VnPay create_payment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/payment_return', (req: Request, res: Response) => {
  try {
    let vnp_Params: Record<string, any> = { ...req.query };

    const secureHash = vnp_Params['vnp_SecureHash'];

    // xóa hash trước khi verify
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    // sort lại params
    const sortedParams = Object.fromEntries(Object.entries(vnp_Params).sort());

    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', process.env.VNP_HASHSECRET!);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const responseCode = vnp_Params['vnp_ResponseCode'];

      if (responseCode === '00') {
        return res.json({
          message: 'Thanh toán thành công',
          data: vnp_Params,
        });
      } else {
        return res.json({
          message: 'Thanh toán thất bại',
          code: responseCode,
        });
      }
    } else {
      return res.status(400).json({
        message: 'Sai chữ ký',
      });
    }
  } catch (error) {
    console.error('VnPay payment_return error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;