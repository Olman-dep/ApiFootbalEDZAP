// infrastructure/user/persistence/user.mapper.ts
import { User } from '../../../../domain/models/user/user.entity.js';
import { UserDocument } from './user.schema.js';
export class UserMapper {
  static toDomain(doc: UserDocument): User {
    return new User({
      id: doc._id,
      email: doc.email,
      name: doc.name,
      passwordHash: doc.passwordHash,
      emailVerified: doc.emailVerified,
      verificationToken: doc.verificationToken,
      verificationTokenExpiresAt: doc.verificationTokenExpiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(user: User): UserDocument {
    const { id, ...rest } = user.toProps();
    return { _id: id, ...rest };
  }
}