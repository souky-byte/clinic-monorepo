import { ApiProperty } from '@nestjs/swagger';

// Note: Structure for mostSoldItems and recentRestocks needs clarification
// Assuming simple structures for now based on common patterns.
class MostSoldItemStatDto {
    @ApiProperty({ example: 1, description: 'ID of the most sold item' })
    id: number;

    @ApiProperty({ example: 'Vitamin C Forte', description: 'Name of the most sold item' })
    name: string;

    @ApiProperty({ example: 50, description: 'Total quantity sold (or current stock, clarify logic)' })
    quantity: number;
}

class RecentRestockStatDto {
    @ApiProperty({ example: 3, description: 'ID of the restocked item' })
    id: number;

    @ApiProperty({ example: 'Zinc Chelate', description: 'Name of the restocked item' })
    name: string;

    @ApiProperty({ example: 100, description: 'Quantity added in the restock' })
    quantity: number;

    @ApiProperty({ example: '2024-05-01T14:00:00.000Z', description: 'Timestamp of the restock event' })
    date: string; // Assuming ISO string date
}

export class InventoryStatsDto {
    @ApiProperty({ example: 7, description: 'Total number of distinct inventory items' })
    totalItems: number;

    @ApiProperty({ example: 76194.70, description: 'Total value of current inventory (Price with VAT * Quantity)' })
    totalValue: number;

    @ApiProperty({ example: 69125.00, description: 'Total value of current inventory (Price without VAT * Quantity)' })
    totalValueWithoutVAT: number;

    @ApiProperty({ example: 1, description: 'Number of items currently considered low stock' })
    lowStockItems: number;

    @ApiProperty({ type: [MostSoldItemStatDto], description: 'List of most sold items (exact structure depends on implementation)' })
    mostSoldItems: MostSoldItemStatDto[];

    @ApiProperty({ type: [RecentRestockStatDto], description: 'List of recent restock events (exact structure depends on implementation)' })
    recentRestocks: RecentRestockStatDto[];
} 