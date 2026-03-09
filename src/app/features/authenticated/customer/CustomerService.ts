import { AppDataSource } from '../../../database';
import { Customer } from '../../../entities/Customer';

export class CustomerService {
  private repo = AppDataSource.getMongoRepository(Customer);

  async getAllCustomers(): Promise<Customer[]> {
    return this.repo.find();
  }
}
