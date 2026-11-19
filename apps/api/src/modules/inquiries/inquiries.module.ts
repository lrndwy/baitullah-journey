import { Module } from '@nestjs/common'
import { InquiriesController } from './inquiries.controller'
import { InquiriesService } from './inquiries.service'
import { PublicInquiriesController } from './public-inquiries.controller'

@Module({
  controllers: [InquiriesController, PublicInquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}