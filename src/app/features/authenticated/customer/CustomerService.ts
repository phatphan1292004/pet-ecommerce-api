import { AppDataSource } from '../../../database';
import { Customer } from '../../../entities/Customer';
import { Role } from '../../../entities/Role';
import { BadRequestError, ConflictError, NotFoundError } from '../../../exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface SyncCustomerData {
  firebaseUid: string;
  email: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
}

export interface UpdateCustomerProfileData {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  birthDate?: string;
  gender?: string;
}

export interface CustomerRoleInfoResponse {
  _id: string;
  name: string;
  description: string | null;
}

export interface CustomerResponse {
  _id: ObjectId;
  firebaseUid: string;
  displayName: string;
  email: string;
  phoneNumber: string | null;
  photoURL: string | null;
  birthDate: string | null;
  gender: string | null;
  role: string | null;
  roleInfo: CustomerRoleInfoResponse | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerService {
  private repo = AppDataSource.getMongoRepository(Customer);
  private roleRepo = AppDataSource.getMongoRepository(Role);

  async getCustomerById(firebaseUid: string): Promise<CustomerResponse> {
    const customer = await this.repo.findOne({
      where: { firebaseUid: firebaseUid }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return this.toCustomerResponse(customer);
  }

  async syncCustomer(userData: SyncCustomerData): Promise<CustomerResponse> {
    // Tìm customer theo firebaseUid
    const existingCustomer = await this.repo.findOne({
      where: { firebaseUid: userData.firebaseUid }
    });

    if (existingCustomer) {
      // Thông báo lỗi nếu đã tồn tại
      throw new ConflictError('Customer already exists with this Firebase UID');
    }

    const defaultRole = await this.findRoleByName('USER');
    if (!defaultRole) {
      throw new NotFoundError('Default role USER not found');
    }

    // Tạo mới customer
    const newCustomer = this.repo.create({
      firebaseUid: userData.firebaseUid,
      displayName: userData.displayName,
      email: userData.email,
      phoneNumber: userData.phone,
      photoURL: userData.photoURL,
      role: defaultRole._id,
    });

    const savedCustomer = await this.repo.save(newCustomer);
    return this.toCustomerResponse(savedCustomer);
  }

  async updateCustomerProfile(firebaseUid: string, updateData: UpdateCustomerProfileData): Promise<CustomerResponse> {
    const existingCustomer = await this.repo.findOne({
      where: { firebaseUid }
    });

    if (!existingCustomer) {
      throw new NotFoundError('Customer not found');
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No data provided to update');
    }

    if (updateData.photoURL !== undefined) {
      const isValidUrl = /^https?:\/\//i.test(updateData.photoURL);
      if (!isValidUrl) {
        throw new BadRequestError('photoURL must be a valid http/https link');
      }
    }

    Object.assign(existingCustomer, updateData);
    const savedCustomer = await this.repo.save(existingCustomer);
    return this.toCustomerResponse(savedCustomer);
  }

  private async toCustomerResponse(customer: Customer): Promise<CustomerResponse> {
    const roleObjectId = this.toRoleObjectId(customer.role);
    const role = roleObjectId
      ? await this.roleRepo.findOne({ where: { _id: roleObjectId } })
      : null;

    return {
      _id: customer._id,
      firebaseUid: customer.firebaseUid,
      displayName: customer.displayName,
      email: customer.email,
      phoneNumber: customer.phoneNumber ?? null,
      photoURL: customer.photoURL ?? null,
      birthDate: customer.birthDate ?? null,
      gender: customer.gender ?? null,
      role: roleObjectId ? roleObjectId.toHexString() : null,
      roleInfo: role
        ? {
            _id: role._id.toHexString(),
            name: role.name,
            description: role.description ?? null,
          }
        : null,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  private toRoleObjectId(role: Customer['role']): ObjectId | null {
    if (!role) {
      return null;
    }

    if (role instanceof ObjectId) {
      return role;
    }

    if (typeof role === 'string' && ObjectId.isValid(role)) {
      return new ObjectId(role);
    }

    return null;
  }

  private async findRoleByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } });
  }
}
