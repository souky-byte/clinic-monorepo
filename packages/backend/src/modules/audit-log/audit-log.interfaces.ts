export enum AuditLogSortBy {
  TIMESTAMP = 'timestamp',
  USER_NAME = 'userName',
  ACTION = 'action',
}

export interface AuditLogEntry {
  id: number;
  timestamp: Date | string; // string for ISO date format from API
  userId?: number;
  userName?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  sortBy?: AuditLogSortBy;
  sortOrder?: 'asc' | 'desc';
  user?: string;
  action?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  search?: string;
}

export interface PaginatedAuditLogResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 