// application/user/use-cases/verify-email.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import type { UserRepository } from '../../../domain/models/user/user.repository.js';
import { InvalidVerificationTokenError } from '../../../domain/models/user/user.error.js';  


@Injectable()
export class VerifyEmailUseCase {
  constructor(
    // Inyectas mediante un string o Symbol, no mediante la interfaz
    @Inject('IUserRepository') private readonly userRepository: UserRepository
  ) {}
  
  async execute(token: string) {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) throw new InvalidVerificationTokenError();
    user.verifyEmail(token);
    await this.userRepository.save(user);
  }
}