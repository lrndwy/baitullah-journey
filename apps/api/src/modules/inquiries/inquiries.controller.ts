import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import {
  InquiryIdParamSchema,
  ListInquiriesQuerySchema,
  UpdateInquiryStatusSchema,
  type Inquiry,
  type InquiryListResponse,
  type ListInquiriesQuery,
  type UpdateInquiryStatusInput,
} from '@app/contracts'
import { AuditAction, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { InquiriesService } from './inquiries.service'

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @RequirePermissions('inquiries.read')
  @Get()
  async list(
    @Query(new ZodValidationPipe(ListInquiriesQuerySchema)) query: ListInquiriesQuery,
  ): Promise<InquiryListResponse> {
    return this.inquiries.list(query)
  }

  @RequirePermissions('inquiries.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(InquiryIdParamSchema)) params: { id: string },
  ): Promise<{ inquiry: Inquiry }> {
    return { inquiry: await this.inquiries.findById(params.id) }
  }

  @RequirePermissions('inquiries.write')
  @AuditAction('inquiries.status_update')
  @Patch(':id/status')
  async updateStatus(
    @Param(new ZodValidationPipe(InquiryIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateInquiryStatusSchema)) body: UpdateInquiryStatusInput,
  ): Promise<{ inquiry: Inquiry }> {
    return { inquiry: await this.inquiries.updateStatus(params.id, body) }
  }
}
