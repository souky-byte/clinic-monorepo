import { ApiProperty } from '@nestjs/swagger';

export class SlotDto {
  @ApiProperty({
    description: 'Start time of the available slot in ISO 8601 format.',
    example: '2024-07-25T09:00:00.000Z',
  })
  startAt: string;

  @ApiProperty({
    description: 'End time of the available slot in ISO 8601 format.',
    example: '2024-07-25T09:30:00.000Z',
  })
  endAt: string;
}
