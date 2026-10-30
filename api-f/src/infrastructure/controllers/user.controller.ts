import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query,
} from '@nestjs/common';
import { CreateUserUseCase } from '../../application/user/use-cases/create-user.use-case.js';
import { UpdateUserUseCase } from '../../application/user/use-cases/update-user.use-case.js';
import { VerifyEmailUseCase } from '../../application/user/use-cases/verify-email.use-case.js';
import { DeleteUserUseCase } from '../../application/user/use-cases/delete-user.use-case.js';
import { CreateUserDto } from './user/http/dto/create-user.dto.js';
import { UpdateUserDto } from './user/http/dto/update-user.dto.js';
@Controller('users')
export class UserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto) { return this.createUser.execute(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.updateUser.execute({ id, ...dto });
  }

  @Get('verify-email')
  verify(@Query('token') token: string) { return this.verifyEmail.execute(token); }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) { return this.deleteUser.execute(id); }
}