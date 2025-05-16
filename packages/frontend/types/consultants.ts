// Enums related to Consultants
export enum UserRole {
  ADMIN = 'admin',
  CONSULTANT = 'consultant',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ConsultantSortBy {
  NAME = 'name',
  EMAIL = 'email',
  LAST_ACTIVE = 'lastActive',
  CREATED_AT = 'createdAt',
  STATUS = 'status',
}

// Interfaces related to Consultants
export interface Consultant {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PaginatedConsultantsResult {
  data: Consultant[]; 
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// You also provided these DTOs, which might be useful here or elsewhere.
// For now, they are not directly used in the consultants.vue page, but good to keep them grouped.

export interface CreateConsultantDto {
  name: string;
  email: string;
  password: string; 
  role: UserRole;
}

export interface UpdateConsultantDto {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ConsultantQueryDto {
  page?: number;
  limit?: number;
  sortBy?: ConsultantSortBy;
  sortOrder?: 'ASC' | 'DESC'; 
  search?: string;
  status?: UserStatus;
}

export interface ResetConsultantPasswordDto {
  password: string;
}

// Visibility DTOs
export interface UpdateConsultantInventoryVisibilityDto {
  inventoryItemIds?: number[];
}

export interface ConsultantInventoryVisibilityDto {
  id: number; // Inventory Item ID
  name: string; // Inventory Item Name
  visible: boolean;
}

export interface UpdateConsultantAppointmentTypesVisibilityDto {
  appointmentTypeIds: number[];
}

export interface ConsultantAppointmentTypeVisibilityDto {
  id: number; // Appointment Type ID
  name: string; // Appointment Type Name
  visible: boolean;
}

// Stats DTOs
interface AppointmentByTypeStatsDto {
  typeId: number;
  typeName: string;
  count: number;
}

interface RecentAppointmentStatsDto {
  id: number; // Appointment ID
  patientName: string;
  date: string; // Assuming ISO date string
  typeName: string;
}

export interface ConsultantStatsDto {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  appointmentsByType: AppointmentByTypeStatsDto[];
  recentAppointments: RecentAppointmentStatsDto[];
} 