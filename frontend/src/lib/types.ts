export type AppointmentStatus = 'BOOKED' | 'PENDING' | 'CANCELLED' | 'RESCHEDULED' | 'COMPLETED';
export type BookingChannel = 'AI_VOICE' | 'MANUAL_ADMIN' | 'WALK_IN';

export interface TranscriptTurn {
  speaker: 'agent' | 'patient';
  text: string;
  timestamp?: string;
}

export interface CallLog {
  id: string;
  sarvam_call_id: string;
  appointment_id?: string;
  caller_phone: string;
  duration_seconds: number;
  call_status: string;
  recording_url?: string;
  transcript?: TranscriptTurn[];
  ai_summary?: string;
  sentiment?: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  phone?: string;
  slot_duration_minutes: number;
  working_start_time: string;
  working_end_time: string;
  is_active: boolean;
  total_slots_today?: number;
  booked_slots_today?: number;
  occupancy_percentage?: number;
}

export interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_department?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason_for_visit?: string;
  booked_via: BookingChannel;
  cancellation_reason?: string;
  has_call_recording: boolean;
  has_transcript: boolean;
  sarvam_call_id?: string;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  call_log?: CallLog;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  doctor_id: string;
  doctor_name: string;
  patient_name: string;
  patient_phone: string;
  status: AppointmentStatus;
  color: string;
}

export interface DashboardStats {
  total_appointments: number;
  today_appointments: number;
  booked_count: number;
  rescheduled_count: number;
  cancelled_count: number;
  ai_booked_count: number;
  manual_booked_count: number;
  active_doctors: number;
}

export interface DoctorSlot {
  time: string;
  is_available: boolean;
  appointment_id?: string | null;
  patient_name?: string | null;
  status: string;
}
