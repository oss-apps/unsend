export type EmailContent = {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
};