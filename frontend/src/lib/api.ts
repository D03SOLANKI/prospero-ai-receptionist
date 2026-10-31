import { Appointment, CalendarEvent, DashboardStats, Doctor, DoctorSlot } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = {
  // Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE_URL}/appointments/dashboard/stats`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Appointments
  async getAppointments(params?: {
    doctor_id?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
    search?: string;
    sort_by?: string;
  }): Promise<Appointment[]> {
    const searchParams = new URLSearchParams();
    if (params?.doctor_id) searchParams.append('doctor_id', params.doctor_id);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);

    const res = await fetch(`${API_BASE_URL}/appointments?${searchParams.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
  },

  async getAppointmentDetail(id: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE_URL}/appointments/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch appointment detail');
    return res.json();
  },

  async createManualAppointment(data: {
    patient_name: string;
    patient_phone: string;
    doctor_id: string;
    appointment_date: string;
    start_time: string;
    reason_for_visit?: string;
  }): Promise<Appointment> {
    const res = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create appointment');
    }
    return res.json();
  },

  async rescheduleAppointment(id: string, new_date: string, new_time: string, doctor_id?: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE_URL}/appointments/${id}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_date, new_time, doctor_id }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to reschedule appointment');
    }
    return res.json();
  },

  async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE_URL}/appointments/${id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Cancelled by clinic admin' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to cancel appointment');
    }
    return res.json();
  },

  // Calendar
  async getCalendarEvents(startDate?: string, endDate?: string, doctorId?: string): Promise<CalendarEvent[]> {
    const searchParams = new URLSearchParams();
    if (startDate) searchParams.append('start_date', startDate);
    if (endDate) searchParams.append('end_date', endDate);
    if (doctorId) searchParams.append('doctor_id', doctorId);

    const res = await fetch(`${API_BASE_URL}/appointments/calendar/events?${searchParams.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch calendar events');
    return res.json();
  },

  // Doctors
  async getDoctors(date?: string): Promise<Doctor[]> {
    const url = date ? `${API_BASE_URL}/doctors?date=${date}` : `${API_BASE_URL}/doctors`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch doctors');
    return res.json();
  },

  async getDoctorSlots(doctorId: string, date: string): Promise<{ doctor_id: string; doctor_name: string; date: string; slots: DoctorSlot[] }> {
    const res = await fetch(`${API_BASE_URL}/doctors/${doctorId}/slots?date=${date}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch doctor slots');
    return res.json();
  },

  // Simulator
  async simulateSarvamCall(doctorId?: string): Promise<any> {
    const searchParams = new URLSearchParams();
    if (doctorId) searchParams.append('doctor_id', doctorId);

    const res = await fetch(`${API_BASE_URL}/simulator/simulate-call?${searchParams.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to simulate Sarvam voice call');
    return res.json();
  }
};
