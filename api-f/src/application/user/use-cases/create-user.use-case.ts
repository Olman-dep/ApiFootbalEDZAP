// application/user/use-cases/create-user.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { User } from '../../../domain/models/user/user.entity.js';
import { EmailAlreadyExistsError } from '../../../domain/models/user/user.error.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/models/user/user.repository.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../ports/password-hasher.port.js';
import { MAILER, type Mailer } from '../ports/mailer.port.js';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async execute(cmd: { email: string; name: string; password: string }) {
    const existing = await this.users.findByEmail(cmd.email.toLowerCase());
    if (existing) throw new EmailAlreadyExistsError();

    const user = User.create({
      id: randomUUID(),
      email: cmd.email,
      name: cmd.name,
      passwordHash: await this.hasher.hash(cmd.password),
      verificationToken: randomBytes(32).toString('hex'),
    });

    await this.users.save(user);
    await this.mailer.sendVerificationEmail(user.email, user.verificationToken!);
    return { id: user.id, email: user.email, name: user.name };
  }
}