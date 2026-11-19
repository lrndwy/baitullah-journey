import { createTransport, type Transporter } from 'nodemailer'
import { getEnv, smtpConfigured } from '../config/index'
import { rootLogger } from '../logger/index'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Mail is a kernel capability, not a module's business: password reset today,
 * invitations and alerts tomorrow. Without `SMTP_URL` the message is logged
 * verbatim instead of sent, so local development and end-to-end tests can read
 * the reset code straight out of the API log.
 */
export class Mailer {
  private readonly transport: Transporter | undefined

  constructor() {
    this.transport = smtpConfigured() ? createTransport(getEnv().SMTP_URL) : undefined
  }

  get configured(): boolean {
    return this.transport !== undefined
  }

  async send(message: MailMessage): Promise<void> {
    const from = getEnv().MAIL_FROM

    if (!this.transport) {
      rootLogger().info(
        { to: message.to, subject: message.subject, body: message.text },
        'mail not configured — message logged instead of sent',
      )
      return
    }

    await this.transport.sendMail({ from, ...message })
  }
}