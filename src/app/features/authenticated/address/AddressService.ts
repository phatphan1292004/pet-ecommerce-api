import { AppDataSource } from '@/app/database';
import { Address } from '@/app/entities/Address';
import { Customer } from '@/app/entities/Customer';
import { BadRequestError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface CreateAddressData {
  firebaseUid: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  province: string;
  ward: string;
  type: string;
  isDefault?: boolean;
}

export interface AddressResponse {
  _id: Address['_id'];
  firebaseUid: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  province: string;
  ward: string;
  type: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AddressService {
  private addressRepo = AppDataSource.getMongoRepository(Address);
  private customerRepo = AppDataSource.getMongoRepository(Customer);

  async getAddressesByFirebaseUid(firebaseUid: string): Promise<AddressResponse[]> {
    if (!firebaseUid || firebaseUid.trim().length === 0) {
      throw new BadRequestError('firebaseUid is required');
    }

    const customer = await this.customerRepo.findOne({
      where: { firebaseUid: firebaseUid }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const addresses = await this.addressRepo.find({
      where: { firebaseUid: firebaseUid },
      order: { createdAt: 'DESC' }
    });

    // Default address first, then newest addresses.
    const sortedAddresses = addresses.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

    return sortedAddresses.map(this.toAddressResponse);
  }

  async deleteAddress(addressId: string, firebaseUid: string): Promise<void> {
    if (!addressId || addressId.trim().length === 0) {
      throw new BadRequestError('addressId is required');
    }

    if (!ObjectId.isValid(addressId)) {
      throw new NotFoundError('Invalid address id');
    }

    const oid = new ObjectId(addressId.trim());

    const address = await this.addressRepo.findOne({ where: { _id: oid } });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    if (address.firebaseUid !== firebaseUid) {
      throw new BadRequestError('Not allowed to delete this address');
    }

    // If deleting a default address, promote the most recent address to default
    const wasDefault = address.isDefault;

    await this.addressRepo.deleteOne({ _id: oid });

    if (wasDefault) {
      const otherAddresses = await this.addressRepo.find({
        where: { firebaseUid: firebaseUid },
        order: { createdAt: 'DESC' }
      });

      const next = otherAddresses[0];
      if (next) {
        await this.addressRepo.updateOne(
          { _id: next._id },
          { $set: { isDefault: true } }
        );
      }
    }
  }

  async createAddress(payload: CreateAddressData): Promise<Address> {
    this.validateCreatePayload(payload);

    const customer = await this.customerRepo.findOne({
      where: { firebaseUid: payload.firebaseUid }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const existingCount = await this.addressRepo.count({
      where: { firebaseUid: payload.firebaseUid }
    });

    const shouldSetDefault = payload.isDefault === true || existingCount === 0;

    if (shouldSetDefault) {
      await this.addressRepo.updateMany(
        { firebaseUid: payload.firebaseUid },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = this.addressRepo.create({
      firebaseUid: payload.firebaseUid,
      fullName: payload.fullName.trim(),
      phone: payload.phone.trim(),
      email: payload.email?.trim(),
      address: payload.address.trim(),
      province: payload.province.trim(),
      ward: payload.ward.trim(),
      type: payload.type.trim(),
      isDefault: shouldSetDefault
    });

    return this.addressRepo.save(newAddress);
  }

  private toAddressResponse(address: Address): AddressResponse {
    return {
      _id: address._id,
      firebaseUid: address.firebaseUid,
      fullName: address.fullName,
      phone: address.phone,
      email: address.email,
      address: address.address,
      province: address.province,
      ward: address.ward,
      type: address.type,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt
    };
  }

  private validateCreatePayload(payload: CreateAddressData): void {
    if (!payload.firebaseUid || payload.firebaseUid.trim().length === 0) {
      throw new BadRequestError('firebaseUid is required');
    }

    if (!payload.fullName || payload.fullName.trim().length === 0) {
      throw new BadRequestError('fullName is required');
    }

    if (!payload.phone || payload.phone.trim().length === 0) {
      throw new BadRequestError('phone is required');
    }

    if (!payload.address || payload.address.trim().length === 0) {
      throw new BadRequestError('address is required');
    }

    if (!payload.province || payload.province.trim().length === 0) {
      throw new BadRequestError('province is required');
    }

    if (!payload.ward || payload.ward.trim().length === 0) {
      throw new BadRequestError('ward is required');
    }

    if (!payload.type || payload.type.trim().length === 0) {
      throw new BadRequestError('type is required');
    }
  }
}