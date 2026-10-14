
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({})
export class DatabaseModule {
  static forRoot(
    uri: string | undefined = process.env.MONGODB_URI,
  ): DynamicModule {
    if (!uri) {
      return { module: DatabaseModule };
    }

    return {
      module: DatabaseModule,
      imports: [MongooseModule.forRoot(uri)],
    };
  }
}
