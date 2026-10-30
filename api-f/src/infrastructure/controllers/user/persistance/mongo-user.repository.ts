import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../../../domain/models/user/user.entity.js';
import type { UserRepository } from '../../../../domain/models/user/user.repository.js';
import { UserDocument } from './user.schema.js';
import { UserMapper } from './user.mapper.js';

@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(
    @InjectModel(UserDocument.name)
    private readonly model: Model<UserDocument>,
  ) {}

  async save(user: User): Promise<void> {
    const doc = UserMapper.toPersistence(user);
    await this.model.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model.findOne({ email }).lean();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const doc = await this.model.findOne({ verificationToken: token }).lean();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id });
  }
}