import { Router, Request, Response, NextFunction } from 'express';
import {
  AdminCreateUserPayload,
  AdminUpdateUserPayload,
  AdminUserService,
} from './UserService';

const router = Router();
const adminUserService = new AdminUserService();

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

router.get('/admin/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const roleId = req.query.roleId as string | undefined;
    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);

    const users = await adminUserService.getUsers({
      search,
      roleId,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminUserService.getUserById(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminCreateUserPayload;
    const user = await adminUserService.createUser(payload);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminUpdateUserPayload;
    const user = await adminUserService.updateUser(req.params.id as string, payload);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminUserService.deleteUser(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
