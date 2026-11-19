import { Body, Controller, Post } from '@nestjs/common'
import { CreateInquirySchema, type CreateInquiryInput, type Inquiry } from '@app/contracts'
import { Public } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { InquiriesService } from './inquiries.service'

@Controller('public')
export class PublicInquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Public()
  @Post('inquiries')
  async create(
    @Body(new ZodValidationPipe(CreateInquirySchema)) body: CreateInquiryInput,
  ): Promise<{ inquiry: Inquiry }> {
    return { inquiry: await this.inquiries.createPublic(body) }
  }
}
