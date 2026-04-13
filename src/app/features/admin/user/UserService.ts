import { AppDataSource } from '@/app/database';
import { Customer } from '@/app/entities/Customer';
import { Role } from '@/app/entities/Role';
import { BadRequestError, ConflictError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface AdminUserListQuery {
  search?: string;
  roleId?: string;
  page?: number;
  limit?: number;
}

export interface AdminCreateUserPayload {
  firebaseUid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
  birthDate?: string;
  gender?: string;
  roleId?: string;
}

export interface AdminUpdateUserPayload {
  firebaseUid?: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  birthDate?: string;
  gender?: string;
  roleId?: string | null;
}

export interface AdminUserResponse {
  id: string;
  firebaseUid: string;
  displayName: string;
  email: string;
  phoneNumber: string | null;
  photoURL: string | null;
  birthDate: string | null;
  gender: string | null;
  role: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserListResponse {
  items: AdminUserResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class AdminUserService {
  private customerRepo = AppDataSource.getMongoRepository(Customer);
  private roleRepo = AppDataSource.getMongoRepository(Role);

  async getUsers(query: AdminUserListQuery = {}): Promise<AdminUserListResponse> {
    const roleObjectId = query.roleId?.trim() ? this.parseObjectId(query.roleId, 'roleId') : null;
    const where: Record<string, unknown> = {};

    if (roleObjectId) {
      where.role = roleObjectId;
    }

    const page = Number.isInteger(query.page) && (query.page as number) > 0 ? (query.page as number) : 1;
    const limitRaw = Number.isInteger(query.limit) && (query.limit as number) > 0 ? (query.limit as number) : 10;
    const limit = Math.min(limitRaw, 50);

    const users = await this.customerRepo.find({ where });
    const normalizedSearch = query.search?.trim().toLowerCase();

    const filteredUsers = normalizedSearch
      ? users.filter((user) =>
          [user.displayName, user.email, user.phoneNumber, user.firebaseUid]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedSearch)),
        )
      : users;

    const sortedUsers = filteredUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const totalItems = sortedUsers.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const pagedUsers = sortedUsers.slice(startIndex, startIndex + limit);

    const items = await Promise.all(pagedUsers.map((user) => this.toAdminUserResponse(user)));

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getUserById(userId: string): Promise<AdminUserResponse> {
    const user = await this.getUserEntityById(userId);
    return this.toAdminUserResponse(user);
  }

  async createUser(payload: AdminCreateUserPayload): Promise<AdminUserResponse> {
    this.validateCreatePayload(payload);

    const firebaseUid = payload.firebaseUid.trim();
    const email = payload.email.trim().toLowerCase();

    await this.ensureUniqueUser(firebaseUid, email);

    const role = await this.resolveRole(payload.roleId);

    const user = this.customerRepo.create({
      firebaseUid,
      displayName: payload.displayName.trim(),
      email,
      phoneNumber: payload.phoneNumber?.trim(),
      photoURL: payload.photoURL?.trim(),
      birthDate: payload.birthDate?.trim(),
      gender: payload.gender?.trim(),
      role: role?._id,
    });

    const savedUser = await this.customerRepo.save(user);
    return this.toAdminUserResponse(savedUser);
  }

  async updateUser(userId: string, payload: AdminUpdateUserPayload): Promise<AdminUserResponse> {
    const user = await this.getUserEntityById(userId);

    if (Object.keys(payload).length === 0) {
      throw new BadRequestError('Update payload is required');
    }

    if (payload.firebaseUid !== undefined) {
      const firebaseUid = payload.firebaseUid.trim();
      if (!firebaseUid) {
        throw new BadRequestError('firebaseUid cannot be empty');
      }

      const duplicateUser = await this.customerRepo.findOne({ where: { firebaseUid } });
      if (duplicateUser && duplicateUser._id.toHexString() !== user._id.toHexString()) {
        throw new ConflictError('firebaseUid already exists');
      }

      user.firebaseUid = firebaseUid;
    }

    if (payload.email !== undefined) {
      const email = payload.email.trim().toLowerCase();
      if (!email) {
        throw new BadRequestError('email cannot be empty');
      }

      const duplicateUser = await this.customerRepo.findOne({ where: { email } });
      if (duplicateUser && duplicateUser._id.toHexString() !== user._id.toHexString()) {
        throw new ConflictError('email already exists');
      }

      user.email = email;
    }

    if (payload.displayName !== undefined) {
      const displayName = payload.displayName.trim();
      if (!displayName) {
        throw new BadRequestError('displayName cannot be empty');
      }
      user.displayName = displayName;
    }

    if (payload.phoneNumber !== undefined) {
      user.phoneNumber = payload.phoneNumber.trim();
    }

    if (payload.photoURL !== undefined) {
      const photoURL = payload.photoURL.trim();
      if (photoURL && !/^https?:\/\//i.test(photoURL)) {
        throw new BadRequestError('photoURL must be a valid http/https link');
      }
      user.photoURL = photoURL;
    }

    if (payload.birthDate !== undefined) {
      user.birthDate = payload.birthDate.trim();
    }

    if (payload.gender !== undefined) {
      user.gender = payload.gender.trim();
    }

    if (payload.roleId !== undefined) {
      if (payload.roleId === null) {
        user.role = undefined;
      } else {
        const role = await this.resolveRole(payload.roleId);
        user.role = role?._id;
      }
    }

    const savedUser = await this.customerRepo.save(user);
    return this.toAdminUserResponse(savedUser);
  }

  async deleteUser(userId: string): Promise<void> {
    const objectId = this.parseObjectId(userId, 'userId');
    const result = await this.customerRepo.deleteOne({ _id: objectId });

    if (!result.deletedCount) {
      throw new NotFoundError('User not found');
    }
  }

  private validateCreatePayload(payload: AdminCreateUserPayload): void {
    if (!payload.firebaseUid?.trim()) {
      throw new BadRequestError('firebaseUid is required');
    }

    if (!payload.displayName?.trim()) {
      throw new BadRequestError('displayName is required');
    }

    if (!payload.email?.trim()) {
      throw new BadRequestError('email is required');
    }

    if (payload.photoURL && !/^https?:\/\//i.test(payload.photoURL.trim())) {
      throw new BadRequestError('photoURL must be a valid http/https link');
    }
  }

  private async ensureUniqueUser(firebaseUid: string, email: string): Promise<void> {
    const existingByFirebaseUid = await this.customerRepo.findOne({ where: { firebaseUid } });
    if (existingByFirebaseUid) {
      throw new ConflictError('firebaseUid already exists');
    }

    const existingByEmail = await this.customerRepo.findOne({ where: { email } });
    if (existingByEmail) {
      throw new ConflictError('email already exists');
    }
  }

  private async resolveRole(roleId?: string): Promise<Role | null> {
    if (roleId === undefined) {
      return this.roleRepo.findOne({ where: { name: 'USER' } });
    }

    if (!roleId.trim()) {
      return null;
    }

    const roleObjectId = this.parseObjectId(roleId, 'roleId');
    const role = await this.roleRepo.findOne({ where: { _id: roleObjectId } });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return role;
  }

  private async getUserEntityById(userId: string): Promise<Customer> {
    const objectId = this.parseObjectId(userId, 'userId');

    const user = await this.customerRepo.findOne({ where: { _id: objectId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  private async toAdminUserResponse(user: Customer): Promise<AdminUserResponse> {
    const roleObjectId = this.toObjectId(user.role);
    const role = roleObjectId ? await this.roleRepo.findOne({ where: { _id: roleObjectId } }) : null;

    return {
      id: user._id.toHexString(),
      firebaseUid: user.firebaseUid,
      displayName: user.displayName,
      email: user.email,
      phoneNumber: user.phoneNumber ?? null,
      photoURL: user.photoURL ?? null,
      birthDate: user.birthDate ?? null,
      gender: user.gender ?? null,
      role: role
        ? {
            id: role._id.toHexString(),
            name: role.name,
            description: role.description ?? null,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private parseObjectId(value: string, fieldName: string): ObjectId {
    if (!value?.trim()) {
      throw new BadRequestError(`${fieldName} is required`);
    }

    try {
      return new ObjectId(value.trim());
    } catch {
      throw new BadRequestError(`${fieldName} is invalid`);
    }
  }

  private toObjectId(value: Customer['role']): ObjectId | null {
    if (!value) {
      return null;
    }

    if (value instanceof ObjectId) {
      return value;
    }

    if (typeof value === 'string' && ObjectId.isValid(value)) {
      return new ObjectId(value);
    }

    return null;
  }
}
