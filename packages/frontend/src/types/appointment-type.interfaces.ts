export interface CreateAppointmentTypeRequest {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  visibleToAll: boolean;
  visibleToSpecificConsultantIds?: number[];
}

export interface UpdateAppointmentTypeRequest extends Partial<CreateAppointmentTypeRequest> {
  // No additional fields needed here as Partial<CreateAppointmentTypeRequest> covers it.
  // If there were fields specific to update that are not in create, they would be listed here.
}

export interface AppointmentTypeResponse {
  id: number;
  name: string;
  description?: string; // Assuming description can be null or undefined in response as well
  price: number;
  durationMinutes: number;
  visibleToAll: boolean;
  visibleTo: number[]; // Note: DTO has 'visibleTo', entity has 'visibleToSpecificConsultants'
  createdAt: string | Date; // Date can be string (ISO format) or Date object
  updatedAt: string | Date;
  appointmentsCount?: number; // Marked as optional as it might not always be present
} 