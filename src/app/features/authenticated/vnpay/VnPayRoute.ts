import express, { Request, Response } from 'express';
import * as crypto from 'crypto';
import qs from 'qs';

const router = express.Router();

const formatVnPayDate = (date: Date): string => {
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnDate.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
};

const normalizeIp = (ip: string): string => {
  if (ip === '::1') {
    return '127.0.0.1';
  }

  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  return ip;
};

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return normalizeIp(forwardedFor[0].split(',')[0].trim());
  }

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return normalizeIp(forwardedFor.split(',')[0].trim());
  }

  return normalizeIp(req.socket.remoteAddress || req.ip || '127.0.0.1');
};

const sortAndEncodeParams = (params: Record<string, string | number>): Record<string, string> => {
  const sortedKeys = Object.keys(params).sort();
  const result: Record<string, string> = {};

  for (const key of sortedKeys) {
    const value = params[key];

    if (value === undefined || value === null) {
      continue;
    }

    result[key] = encodeURIComponent(String(value)).replace(/%20/g, '+');
  }

  return result;
};

const getSignData = (params: Record<string, string | number>): string => {
  const encodedParams = sortAndEncodeParams(params);
  return qs.stringify(encodedParams, { encode: false });
};

const getRawQueryParams = (originalUrl: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const queryIndex = originalUrl.indexOf('?');

  if (queryIndex < 0) {
    return result;
  }

  const queryString = originalUrl.slice(queryIndex + 1);
  const pairs = queryString.split('&').filter(Boolean);

  for (const pair of pairs) {
    const separatorIndex = pair.indexOf('=');

    if (separatorIndex < 0) {
      result[pair] = '';
      continue;
    }

    const key = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    result[key] = value;
  }

  return result;
};

const getRawSignData = (params: Record<string, string>): string => {
  const sortedKeys = Object.keys(params).sort();
  const sortedParams: Record<string, string> = {};

  for (const key of sortedKeys) {
    sortedParams[key] = params[key];
  }

  return qs.stringify(sortedParams, { encode: false });
};

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

    if (!tmnCode || !secretKey || !returnUrl) {
      return res.status(500).json({ message: 'VnPay configuration missing' });
    }

    const createDate = formatVnPayDate(new Date());
    const txnRef = String(orderId);

    const vnp_Params: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: amountNum * 100,
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: getClientIp(req),
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${txnRef}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: txnRef,
    };

    const signData = getSignData(vnp_Params);
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(signData, 'utf-8').digest('hex');

    const queryParams: Record<string, string | number> = {
      ...sortAndEncodeParams(vnp_Params),
      vnp_SecureHash: signed,
    };

    const paymentUrl = `${vnpUrl}?${qs.stringify(queryParams, { encode: false })}`;

    return res.json({ paymentUrl });
  } catch (error) {
    console.error('VnPay create_payment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/payment_return', (req: Request, res: Response) => {
  try {
    const secretKey = process.env.VNP_HASHSECRET;
    if (!secretKey) {
      return res.status(500).json({ message: 'VnPay configuration missing' });
    }

    const vnp_Params: Record<string, string> = {};

    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        if (value[0] !== undefined) {
          vnp_Params[key] = String(value[0]);
        }
      } else if (value !== undefined) {
        vnp_Params[key] = String(value);
      }
    }

    const secureHash = vnp_Params['vnp_SecureHash'];

    // xóa hash trước khi verify
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const rawParams = getRawQueryParams(req.originalUrl);
    delete rawParams['vnp_SecureHash'];
    delete rawParams['vnp_SecureHashType'];

    const signData = getSignData(vnp_Params);
    const rawSignData = getRawSignData(rawParams);
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(signData, 'utf-8').digest('hex');
    const rawHmac = crypto.createHmac('sha512', secretKey);
    const rawSigned = rawHmac.update(rawSignData, 'utf-8').digest('hex');
    const normalizedSecureHash = String(secureHash || '').toLowerCase();
    const isValidSignature =
      normalizedSecureHash === signed.toLowerCase() ||
      normalizedSecureHash === rawSigned.toLowerCase();

    if (isValidSignature) {
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
      console.error('VnPay payment_return signature mismatch', {
        secureHash,
        signed,
        rawSigned,
        signData,
        rawSignData,
      });

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