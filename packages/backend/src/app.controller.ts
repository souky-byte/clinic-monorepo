import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SimpleTestDto } from './simple-test.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('simple-test')
  getSimpleTest(@Query() query: SimpleTestDto): SimpleTestDto {
    return query;
  }
}
