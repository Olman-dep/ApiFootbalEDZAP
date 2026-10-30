// infrastructure/user/persistence/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'users', timestamps: false })
export class UserDocument {
  @Prop({ required: true, unique: true }) _id: string;
  @Prop({ required: true, unique: true, lowercase: true, index: true }) email: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ default: false }) emailVerified: boolean;
  @Prop({ type: String, default: null, index: true }) verificationToken: string | null;
  @Prop({ type: Date, default: null }) verificationTokenExpiresAt: Date | null;
  @Prop() createdAt: Date;
  @Prop() updatedAt: Date;
}

export type UserHydrated = HydratedDocument<UserDocument>;
export const UserSchema = SchemaFactory.createForClass(UserDocument);