import { AppDataSource } from '../../../database';
import { Customer } from '../../../entities/Customer';
import { BadRequestError, ConflictError, NotFoundError } from '../../../exceptions/AppError';

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

export class CustomerService {
  private repo = AppDataSource.getMongoRepository(Customer);

  async getCustomerById(firebaseUid: string): Promise<Customer> {
    const customer = await this.repo.findOne({
      where: { firebaseUid: firebaseUid }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  }

  async syncCustomer(userData: SyncCustomerData): Promise<Customer> {
    // Tìm customer theo firebaseUid
    const existingCustomer = await this.repo.findOne({
      where: { firebaseUid: userData.firebaseUid }
    });

    if (existingCustomer) {
      // Thông báo lỗi nếu đã tồn tại
      throw new ConflictError('Customer already exists with this Firebase UID');
    }

    // Tạo mới customer
    const newCustomer = this.repo.create({
      firebaseUid: userData.firebaseUid,
      displayName: userData.displayName,
      email: userData.email,
      phoneNumber: userData.phone,
    });
    
    return this.repo.save(newCustomer);
  }

  async updateCustomerProfile(firebaseUid: string, updateData: UpdateCustomerProfileData): Promise<Customer> {
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
    return this.repo.save(existingCustomer);
  }
}
