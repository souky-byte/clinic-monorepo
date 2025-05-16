import { IsString, IsNotEmpty } from 'class-validator';

export class TestQueryDto {
  @IsString()
  @IsNotEmpty()
  testParam: string;
} 