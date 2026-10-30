export const MAILER = Symbol('MAILER');

export interface Mailer {
  sendVerificationEmail(to: string, token: string): Promise<void>;
}