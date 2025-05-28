import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Nové heslo pacienta. Musí obsahovat alespoň 8 znaků, jedno velké písmeno, jedno malé písmeno a jedno číslo.',
    example: 'NewSecureP@ssw0rd',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\S]{8,}$/, {
    message: 'Heslo musí obsahovat alespoň 8 znaků, jedno velké písmeno, jedno malé písmeno, jedno číslo a může obsahovat speciální znaky.',
  })
  newPassword: string;
}
