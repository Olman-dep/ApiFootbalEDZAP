import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../../../domain/models/user/user.error.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/models/user/user.repository.js';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError();

    await this.users.delete(id);
  }
}