import { IsString, IsNotEmpty } from 'class-validator'; // IsNotEmpty pro jistotu

export class SimpleTestDto {
  @IsString()
  @IsNotEmpty()
  name: string;
} 