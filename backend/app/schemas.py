from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# ----------------- Doctor Schemas -----------------
class DoctorBase(BaseModel):
    name: str
    specialization: str
    department: str
    phone: Optional[str] = None
    slot_duration_minutes: int = 30
    working_start_time: str = "09:00"
    working_end_time: str = "17:00"
    is_active: bool = True

class DoctorResponse(DoctorBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class DoctorOccupancy(DoctorResponse):
    total_slots_today: int
    booked_slots_today: int
    occupancy_percentage: float

# ----------------- Call Log / Transcript Schemas -----------------
class TranscriptTurn(BaseModel):
    speaker: str # 'agent' or 'patient'
    text: str
    timestamp: Optional[str] = None

class CallLogBase(BaseModel):
    sarvam_call_id: str
    caller_phone: str
    duration_seconds: int = 0
    call_status: str = "COMPLETED"
    recording_url: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    ai_summary: Optional[str] = None
    sentiment: Optional[str] = "Neutral"

class CallLogResponse(CallLogBase):
    id: str
    appointment_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Appointment Schemas -----------------
class AppointmentBase(BaseModel):
    patient_name: str
    patient_phone: str
    doctor_id: str
    appointment_date: str # YYYY-MM-DD
    start_time: str       # HH:MM
    reason_for_visit: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    booked_via: Optional[str] = "MANUAL_ADMIN"

class AppointmentResponse(BaseModel):
    id: str
    patient_name: str
    patient_phone: str
    doctor_id: str
    doctor_name: Optional[str] = None
    doctor_department: Optional[str] = None
    appointment_date: str
    start_time: str
    end_time: str
    status: str
    reason_for_visit: Optional[str] = None
    booked_via: str
    cancellation_reason: Optional[str] = None
    has_call_recording: bool = False
    has_transcript: bool = False
    sarvam_call_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AppointmentDetailResponse(AppointmentResponse):
    doctor: Optional[DoctorResponse] = None
    call_log: Optional[CallLogResponse] = None

class AppointmentRescheduleRequest(BaseModel):
    new_date: str # YYYY-MM-DD
    new_time: str # HH:MM
    doctor_id: Optional[str] = None
    reason: Optional[str] = "Rescheduled via admin dashboard"

class AppointmentCancelRequest(BaseModel):
    reason: Optional[str] = "Cancelled by patient or clinic admin"

# ----------------- Sarvam Samvaad Mid-Call Tool Schemas -----------------
class SarvamAvailabilityQuery(BaseModel):
    date: Optional[str] = None
    appointment_date: Optional[str] = None
    time: Optional[str] = None
    slot_time: Optional[str] = None
    appointment_time: Optional[str] = None
    requested_time: Optional[str] = None
    slot: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor: Optional[str] = None
    specialization: Optional[str] = None
    preferred_time_window: Optional[str] = None # 'morning', 'afternoon', 'evening'

    class Config:
        extra = "allow"

class SlotInfo(BaseModel):
    time: str
    doctor_id: str
    doctor_name: str
    specialization: str

class SarvamAvailabilityResponse(BaseModel):
    success: bool
    is_available: bool = True
    available: bool = True
    requested_time: Optional[str] = None
    date: str
    appointment_date: Optional[str] = None
    formatted_date: Optional[str] = None
    doctor_name: Optional[str] = None
    slots: List[str] = []
    available_slots: List[str] = []
    slots_text: str = ""
    spoken_summary: str
    message: Optional[str] = None
    slot_details: Optional[List[SlotInfo]] = None

    class Config:
        extra = "allow"

class SarvamBookAppointmentRequest(BaseModel):
    sarvam_call_id: Optional[str] = None
    call_id: Optional[str] = None
    patient_name: Optional[str] = None
    name: Optional[str] = None
    patient_phone: Optional[str] = None
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor: Optional[str] = None
    appointment_date: Optional[str] = None
    date: Optional[str] = None
    slot_time: Optional[str] = None
    time: Optional[str] = None
    slot: Optional[str] = None
    appointment_time: Optional[str] = None
    reason_for_visit: Optional[str] = None
    reason: Optional[str] = None

    class Config:
        extra = "allow"

class SarvamBookAppointmentResponse(BaseModel):
    success: bool
    appointment_id: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    spoken_confirmation: str
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"

class SarvamLookupRequest(BaseModel):
    phone_number: str

class SarvamLookupResponse(BaseModel):
    found: bool
    appointments: List[Dict[str, Any]]
    spoken_summary: str

class SarvamVoiceActionResponse(BaseModel):
    success: bool
    spoken_response: str

# ----------------- Sarvam Post-Call Webhook Schema -----------------
class SarvamCallEndedWebhookPayload(BaseModel):
    call_id: Optional[str] = None
    sarvam_call_id: Optional[str] = None
    caller_phone: Optional[str] = None
    caller: Optional[str] = None
    phone: Optional[str] = None
    duration_seconds: Optional[int] = 0
    duration: Optional[int] = 0
    call_status: Optional[str] = "COMPLETED"
    recording_url: Optional[str] = None
    audio_url: Optional[str] = None
    transcript: Optional[Any] = None
    ai_summary: Optional[str] = None
    call_summary: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = "Positive"
    appointment_id: Optional[str] = None

    class Config:
        extra = "allow"

# ----------------- Dashboard & Calendar Schemas -----------------
class CalendarEventResponse(BaseModel):
    id: str
    title: str
    start: str # ISO or YYYY-MM-DDTHH:MM:SS
    end: str
    doctor_id: str
    doctor_name: str
    patient_name: str
    patient_phone: str
    status: str
    color: str

class DashboardStatsResponse(BaseModel):
    total_appointments: int
    today_appointments: int
    booked_count: int
    rescheduled_count: int
    cancelled_count: int
    ai_booked_count: int
    manual_booked_count: int
    active_doctors: int
