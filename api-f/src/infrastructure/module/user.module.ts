import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDocument, UserSchema } from '../controllers/user/persistance/user.schema.js';
import { UserController } from '../controllers/user.controller.js';
import { CreateUserUseCase } from '../../application/user/use-cases/create-user.use-case.js';
import { UpdateUserUseCase } from '../../application/user/use-cases/update-user.use-case.js';
import { VerifyEmailUseCase } from '../../application/user/use-cases/verify-email.use-case.js';
import { DeleteUserUseCase } from '../../application/user/use-cases/delete-user.use-case.js';
import { USER_REPOSITORY } from '../../domain/models/user/user.repository.js';
import { PASSWORD_HASHER } from '../../application/user/ports/password-hasher.port.js';
import { MAILER } from '../../application/user/ports/mailer.port.js';
import { MongoUserRepository } from '../controllers/user/persistance/mongo-user.repository.js';
import { BcryptPasswordHasher } from '../controllers/user/security/bcrypt-password-hasher.js';
import { SmtpMailer } from '../controllers/user/mail/smtp-mailer.js';
@Module({
  imports: [MongooseModule.forFeature([{ name: UserDocument.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [
    CreateUserUseCase, UpdateUserUseCase, VerifyEmailUseCase, DeleteUserUseCase,
    { provide: USER_REPOSITORY, useClass: MongoUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: MAILER, useClass: SmtpMailer },
  ],
})
export class UserModule {}