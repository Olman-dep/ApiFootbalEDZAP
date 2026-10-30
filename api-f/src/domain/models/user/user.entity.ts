import {EmailAlreadyVerifiedError , InvalidVerificationTokenError} from './user.error.js';

// domain/user/user.entity.ts
export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  constructor(private props: UserProps) {}

  get id() { return this.props.id; }
  get email() { return this.props.email; }
  get name() { return this.props.name; }
  get passwordHash() { return this.props.passwordHash; }
  get emailVerified() { return this.props.emailVerified; }
  get verificationToken() { return this.props.verificationToken; }
  get verificationTokenExpiresAt() { return this.props.verificationTokenExpiresAt; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  static create(data: { id: string; email: string; name: string; passwordHash: string; verificationToken: string }): User {
    const now = new Date();
    return new User({
      ...data,
      email: data.email.toLowerCase().trim(),
      emailVerified: false,
      verificationToken: data.verificationToken,
      verificationTokenExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    });
  }

  updateProfile(data: { name?: string }) {
    if (data.name) this.props.name = data.name.trim();
    this.props.updatedAt = new Date();
  }

  verifyEmail(token: string) {
    if (this.props.emailVerified) throw new EmailAlreadyVerifiedError();
    const expired =
      !this.props.verificationTokenExpiresAt ||
      this.props.verificationTokenExpiresAt < new Date();
    if (this.props.verificationToken !== token || expired) {
      throw new InvalidVerificationTokenError();
    }
    this.props.emailVerified = true;
    this.props.verificationToken = null;
    this.props.verificationTokenExpiresAt = null;
    this.props.updatedAt = new Date();
  }

  toProps(): UserProps { return { ...this.props }; }
}