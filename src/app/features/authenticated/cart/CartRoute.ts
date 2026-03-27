import { Router, Request, Response, NextFunction } from 'express';
import { CartService, SyncCartItemPayload, UpsertCartPayload } from './CartService';

const router = Router();
const cartService = new CartService();

const sendCartResponse = (res: Response, cart: Awaited<ReturnType<CartService['getCart']>>) => {
  res.status(200).json({
    success: true,
    data: cart ?? { products: [] },
  });
};

router.get('/carts/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const status = (req.query.status as string) || 'open';
    const cart = await cartService.getCart(customerId, status);

    sendCartResponse(res, cart);
  } catch (error) {
    next(error);
  }
});

router.get('/carts/:customerId/open', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const cart = await cartService.getCart(customerId, 'open');
    sendCartResponse(res, cart);
  } catch (error) {
    next(error);
  }
});

router.get('/carts/open/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const cart = await cartService.getCart(customerId, 'open');
    sendCartResponse(res, cart);
  } catch (error) {
    next(error);
  }
});

router.post('/carts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as UpsertCartPayload;
    const cart = await cartService.upsertOpenCart(payload);

    res.status(200).json({
      success: true,
      message: 'Cart synced successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/carts/:customerId/open', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const body = req.body as Omit<UpsertCartPayload, 'customerId'>;
    const cart = await cartService.upsertOpenCart({
      ...body,
      customerId,
    });

    res.status(200).json({
      success: true,
      message: 'Open cart updated successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/carts/:customerId/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const payload = req.body as SyncCartItemPayload;
    const cart = await cartService.syncCartItem(customerId, payload);

    res.status(200).json({
      success: true,
      message: 'Cart item synced successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/carts/:customerId/items/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const productId = req.params.productId as string;
    const cart = await cartService.removeCartItem(customerId, productId);

    res.status(200).json({
      success: true,
      message: 'Cart item removed successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/carts/:customerId/open', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const cart = await cartService.clearOpenCart(customerId);

    res.status(200).json({
      success: true,
      message: 'Open cart cleared successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/carts/:customerId/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const cart = await cartService.closeOpenCart(customerId);

    res.status(200).json({
      success: true,
      message: 'Checkout completed, cart is now close',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/carts/:customerId/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const cart = await cartService.closeOpenCart(customerId);

    res.status(200).json({
      success: true,
      message: 'Cart closed successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

export default router;