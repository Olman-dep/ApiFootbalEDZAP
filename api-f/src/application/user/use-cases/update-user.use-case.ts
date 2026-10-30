import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../../../domain/models/user/user.error.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/models/user/user.repository.js';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(cmd: { id: string; name?: string }) {
    const user = await this.users.findById(cmd.id);
    if (!user) throw new UserNotFoundError();

    user.updateProfile({ name: cmd.name });
    await this.users.save(user);

    return { id: user.id, email: user.email, name: user.name };
  }
}