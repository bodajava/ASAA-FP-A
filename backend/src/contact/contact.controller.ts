import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@Controller('api/v1/support')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  async sendContactMessage(@Body() dto: ContactDto) {
    return this.contactService.sendContactMessage(dto);
  }
}
