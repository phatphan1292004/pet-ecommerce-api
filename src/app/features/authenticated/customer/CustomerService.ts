import { AppDataSource } from '../../../database';
import { Customer } from '../../../entities/Customer';
import { ConflictError } from '../../../exceptions/AppError';

export interface SyncCustomerData {
  firebaseUid: string;
  email: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
}

export class CustomerService {
  private repo = AppDataSource.getMongoRepository(Customer);

  async getAllCustomers(): Promise<Customer[]> {
    return this.repo.find();
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
}
