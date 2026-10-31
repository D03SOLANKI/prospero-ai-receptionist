import logging
from datetime import datetime, timedelta
from typing import Optional, List
from dateutil import parser as date_parser
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Doctor, Appointment, CallLog
from app.schemas import (
    SarvamAvailabilityQuery, SarvamAvailabilityResponse, SlotInfo,
    SarvamBookAppointmentRequest, SarvamBookAppointmentResponse,
    SarvamLookupRequest, SarvamLookupResponse,
    SarvamCallEndedWebhookPayload, SarvamVoiceActionResponse
)
from app.websocket_manager import realtime_manager

logger = logging.getLogger("sarvam_voice")
router = APIRouter(prefix="/api/v1", tags=["Sarvam Voice Receptionist Integration"])

IST = timedelta(hours=5, minutes=30)

def get_ist_now() -> datetime:
    """Current timestamp in Indian Standard Time (IST, UTC+5:30)"""
    return datetime.utcnow() + IST

def get_ist_today_str() -> str:
    """Current YYYY-MM-DD in Indian Standard Time"""
    return get_ist_now().strftime("%Y-%m-%d")

def format_12hr_time(hh_mm: str) -> str:
    """Converts '09:00' -> '9:00 AM', '16:30' -> '4:30 PM'"""
    try:
        dt = datetime.strptime(hh_mm, "%H:%M")
        return dt.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return hh_mm

def parse_time_flexible(time_str: Optional[str]) -> str:
    """Returns normalized HH:MM in 24hr format from ANY time input ('4:30 PM', '16:30', '4:30pm', '4:30', '4 PM')"""
    if not time_str or not str(time_str).strip():
        return "10:00"
    cleaned = str(time_str).strip().upper()
    try:
        dt = date_parser.parse(cleaned)
        hr = dt.hour
        # Heuristic for clinic hours: if caller says '4:00' or '5:30' without AM/PM,
        # clinics operate in afternoon (4 PM/16:00), not early morning (4 AM)
        if "AM" not in cleaned and "PM" not in cleaned:
            if 1 <= hr <= 6:
                hr += 12
        return f"{hr:02d}:{dt.minute:02d}"
    except Exception:
        if "PM" in cleaned:
            try:
                parts = cleaned.replace("PM", "").strip().split(":")
                hr = int(parts[0])
                mn = int(parts[1]) if len(parts) > 1 else 0
                if hr < 12:
                    hr += 12
                return f"{hr:02d}:{mn:02d}"
            except Exception:
                pass
        return "10:00"

def parse_date_flexible(date_str: Optional[str]) -> str:
    """Returns normalized YYYY-MM-DD from ANY date input ('2026-10-31', 'today', 'tomorrow', '31 October')"""
    if not date_str or not str(date_str).strip():
        return get_ist_today_str()
    cleaned = str(date_str).strip().lower()
    if cleaned in ["today", "aaj", "current", "todays", "ivattu", "ee dina"]:
        return get_ist_today_str()
    if cleaned in ["tomorrow", "kal", "next day", "naale"]:
        return (get_ist_now() + timedelta(days=1)).strftime("%Y-%m-%d")
    try:
        dt = date_parser.parse(cleaned)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return get_ist_today_str()

def compute_end_time(start_time_str: str, duration_mins: int = 30) -> str:
    """Helper to calculate end time HH:MM from any start time string"""
    norm_start = parse_time_flexible(start_time_str)
    start_dt = datetime.strptime(norm_start, "%H:%M")
    end_dt = start_dt + timedelta(minutes=duration_mins)
    return end_dt.strftime("%H:%M")

PROSPERO_MORNING_SLOTS = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"]
PROSPERO_EVENING_SLOTS = ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"]
PROSPERO_ALL_SLOTS = PROSPERO_MORNING_SLOTS + PROSPERO_EVENING_SLOTS

def generate_prospero_slots(target_date: str) -> List[str]:
    """
    Returns valid 30-min slots for Prospero Microscopic Dental Clinic & Implant Centre.
    Operating hours:
      Mon-Sat: 10:00 AM – 1:30 PM and 4:00 PM – 8:00 PM.
      Sunday: Closed (returns empty list).
    """
    try:
        dt = datetime.strptime(target_date, "%Y-%m-%d")
        if dt.weekday() == 6: # Sunday
            return []
    except Exception:
        pass
    return list(PROSPERO_ALL_SLOTS)

def generate_day_slots(start_str: str, end_str: str, duration_mins: int = 30) -> List[str]:
    """Generates slots matching Prospero Dental Clinic schedule"""
    return list(PROSPERO_ALL_SLOTS)

GENERIC_DOCTOR_TERMS = {
    "doctor", "dr", "doc", "any", "anyone", "general", "consultant",
    "physician", "appointment", "clinic", "hospital", "dentist", "dental",
    "himanshu", "oberoi", "none", "null", "undefined", ""
}

def resolve_target_doctors(
    doctor_name: Optional[str],
    specialization: Optional[str],
    db: Session
) -> List[Doctor]:
    """
    Intelligently matches doctors for Prospero Microscopic Dental Clinic & Implant Centre.
    Dr. Himanshu Oberoi is the chief specialist across Endodontics, Implants, Pediatric,
    and General Dentistry.
    """
    active_doctors = db.query(Doctor).filter(Doctor.is_active == True).all()
    if not active_doctors:
        return []

    if not doctor_name and not specialization:
        return active_doctors

    cleaned_name = (doctor_name or "").strip()
    name_without_dr = cleaned_name
    for prefix in ["doctor ", "dr. ", "dr.", "dr "]:
        if name_without_dr.lower().startswith(prefix):
            name_without_dr = name_without_dr[len(prefix):].strip()

    # If caller asked about Himanshu / Oberoi
    if "himanshu" in name_without_dr.lower() or "oberoi" in name_without_dr.lower():
        himanshu_docs = [d for d in active_doctors if "himanshu" in d.name.lower()]
        if himanshu_docs:
            return himanshu_docs

    # If caller literally asked "slots for doctor", "dentist", "doc", etc.
    if name_without_dr.lower() in GENERIC_DOCTOR_TERMS or len(name_without_dr) <= 2:
        if specialization:
            matched_spec = [d for d in active_doctors if specialization.lower() in d.specialization.lower() or specialization.lower() in d.department.lower()]
            if matched_spec:
                return matched_spec
        return active_doctors

    # Name matching (e.g., 'Himanshu', 'Oberoi')
    matched = [d for d in active_doctors if name_without_dr.lower() in d.name.lower()]
    if matched:
        return matched

    # Dental specialty matching (e.g., 'root canal', 'endodontic', 'implant', 'pediatric', 'cleaning', 'rehab')
    matched_spec = [d for d in active_doctors if name_without_dr.lower() in d.specialization.lower() or name_without_dr.lower() in d.department.lower()]
    if matched_spec:
        return matched_spec

    if specialization:
        matched_by_spec = [d for d in active_doctors if specialization.lower() in d.specialization.lower() or specialization.lower() in d.department.lower()]
        if matched_by_spec:
            return matched_by_spec

    # Default to chief specialist Dr. Himanshu Oberoi
    return active_doctors

# -------------------------------------------------------------
# TOOL 1: CHECK DOCTOR / SPECIALIZATION AVAILABILITY (GET + POST)
# -------------------------------------------------------------
def _check_availability_internal(
    date: Optional[str],
    doctor_name: Optional[str],
    specialization: Optional[str],
    preferred_time_window: Optional[str],
    requested_time_raw: Optional[str],
    db: Session
) -> SarvamAvailabilityResponse:
    target_date = parse_date_flexible(date)
    doctors = resolve_target_doctors(doctor_name, specialization, db)

    try:
        date_obj = datetime.strptime(target_date, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%d %B %Y")
        # Check Sunday closure for Prospero Dental Clinic
        if date_obj.weekday() == 6:
            return SarvamAvailabilityResponse(
                success=False,
                is_available=False,
                available=False,
                date=target_date,
                appointment_date=target_date,
                formatted_date=formatted_date,
                doctor_name="Dr. Himanshu Oberoi",
                available_slots=[],
                slots=[],
                slots_text="",
                spoken_summary="Prospero Dental Clinic & Implant Centre is closed on Sundays. Dr. Himanshu Oberoi is available Monday to Saturday between 10:00 AM – 1:30 PM and 4:00 PM – 8:00 PM. Would you like to check tomorrow or Monday?",
                message="Prospero Dental Clinic is closed on Sundays."
            )
    except Exception:
        formatted_date = target_date

    if not doctors:
        return SarvamAvailabilityResponse(
            success=False,
            is_available=False,
            available=False,
            date=target_date,
            appointment_date=target_date,
            formatted_date=formatted_date,
            available_slots=[],
            slots=[],
            slots_text="",
            spoken_summary="I am sorry, our clinic has no active doctors available for booking right now.",
            message="No active doctors available."
        )

    primary_doc = doctors[0]
    all_slot_details = []
    readable_slots_set = []
    raw_free_slots = []

    for doc in doctors:
        potential_slots = generate_prospero_slots(target_date)
        
        booked = db.query(Appointment.start_time).filter(
            Appointment.doctor_id == doc.id,
            Appointment.appointment_date == target_date,
            Appointment.status.in_(["BOOKED", "RESCHEDULED", "PENDING"])
        ).all()
        booked_times = {b[0] for b in booked}

        free_slots = [s for s in potential_slots if s not in booked_times]
        raw_free_slots.extend(free_slots)

        if preferred_time_window == "morning":
            free_slots = [s for s in free_slots if int(s.split(":")[0]) < 14]
        elif preferred_time_window in ["afternoon", "evening"]:
            free_slots = [s for s in free_slots if int(s.split(":")[0]) >= 16]

        for s in free_slots:
            r_time = format_12hr_time(s)
            if r_time not in readable_slots_set:
                readable_slots_set.append(r_time)
            all_slot_details.append(SlotInfo(
                time=r_time,
                doctor_id=doc.id,
                doctor_name=doc.name,
                specialization=doc.specialization
            ))

    # Pick convenient slots to present concisely over voice (e.g. morning + evening options)
    slots_text = ", ".join(readable_slots_set[:6]) if readable_slots_set else ""

    # Check if caller asked about a specific time slot
    if requested_time_raw and str(requested_time_raw).strip() and str(requested_time_raw).strip().lower() not in ["none", "null", "undefined", ""]:
        norm_req = parse_time_flexible(str(requested_time_raw).strip())
        display_req = format_12hr_time(norm_req)

        if norm_req in raw_free_slots:
            spoken = f"Yes, {display_req} is available with {primary_doc.name} on {formatted_date}. Would you like me to book it for you?"
            return SarvamAvailabilityResponse(
                success=True,
                is_available=True,
                available=True,
                requested_time=display_req,
                date=target_date,
                appointment_date=target_date,
                formatted_date=formatted_date,
                doctor_name=primary_doc.name,
                slots=readable_slots_set,
                available_slots=readable_slots_set,
                slots_text=slots_text,
                spoken_summary=spoken,
                message=f"Yes, {display_req} is available.",
                slot_details=all_slot_details
            )
        else:
            spoken = f"Sorry, {display_req} is not available. We have {slots_text} available today with {primary_doc.name}. Which one would you prefer?"
            return SarvamAvailabilityResponse(
                success=True,
                is_available=False,
                available=False,
                requested_time=display_req,
                date=target_date,
                appointment_date=target_date,
                formatted_date=formatted_date,
                doctor_name=primary_doc.name,
                slots=readable_slots_set,
                available_slots=readable_slots_set,
                slots_text=slots_text,
                spoken_summary=spoken,
                message=f"Sorry, {display_req} is not available.",
                slot_details=all_slot_details
            )

    # General inquiry: "What slots are available?"
    if not readable_slots_set:
        spoken = f"All slots are fully booked for {primary_doc.name} on {formatted_date}. Would you like to check tomorrow?"
        return SarvamAvailabilityResponse(
            success=True,
            is_available=False,
            available=False,
            date=target_date,
            appointment_date=target_date,
            formatted_date=formatted_date,
            doctor_name=primary_doc.name,
            available_slots=[],
            slots=[],
            slots_text="",
            spoken_summary=spoken,
            message=f"All slots fully booked on {formatted_date}."
        )

    spoken = f"{primary_doc.name} at Prospero Dental Clinic has open slots on {formatted_date} at {slots_text}. Which time works best for you?"
    message_str = f"Available slots for {primary_doc.name} on {formatted_date}: {slots_text}."

    return SarvamAvailabilityResponse(
        success=True,
        is_available=True,
        available=True,
        date=target_date,
        appointment_date=target_date,
        formatted_date=formatted_date,
        doctor_name=primary_doc.name,
        slots=readable_slots_set,
        available_slots=readable_slots_set,
        slots_text=slots_text,
        spoken_summary=spoken,
        message=message_str,
        slot_details=all_slot_details
    )

@router.get("/voice/availability", response_model=SarvamAvailabilityResponse)
@router.get("/voice/check-availability", response_model=SarvamAvailabilityResponse)
def check_availability_get(
    date: Optional[str] = Query(None, description="Date YYYY-MM-DD or 'today'"),
    time: Optional[str] = Query(None, description="Requested time slot e.g. '4:00 PM'"),
    slot_time: Optional[str] = Query(None),
    doctor_name: Optional[str] = Query(None),
    specialization: Optional[str] = Query(None),
    preferred_time_window: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    target_time = time or slot_time
    return _check_availability_internal(date, doctor_name, specialization, preferred_time_window, target_time, db)

@router.post("/voice/availability", response_model=SarvamAvailabilityResponse)
@router.post("/voice/check-availability", response_model=SarvamAvailabilityResponse)
async def check_availability_post(
    payload: Optional[SarvamAvailabilityQuery] = None,
    db: Session = Depends(get_db)
):
    target_date = (payload.date or payload.appointment_date if payload else None)
    doc_name = (payload.doctor_name or payload.doctor if payload else None)
    spec = payload.specialization if payload else None
    window = payload.preferred_time_window if payload else None
    target_time = (payload.time or payload.slot_time or payload.appointment_time or payload.slot or payload.requested_time if payload else None)
    
    logger.info(f"Check availability invoked - date: {target_date}, time: {target_time}, doctor: {doc_name}")
    return _check_availability_internal(target_date, doc_name, spec, window, target_time, db)

# -------------------------------------------------------------
# TOOL 2: BOOK / CREATE APPOINTMENT (POST)
# -------------------------------------------------------------
@router.post("/voice/book", response_model=SarvamBookAppointmentResponse)
@router.post("/voice/create-appointment", response_model=SarvamBookAppointmentResponse)
async def book_appointment_voice(
    payload: SarvamBookAppointmentRequest,
    db: Session = Depends(get_db)
):
    """
    Called mid-call by Sarvam Samvaad AI to finalize the appointment booking.
    Immediately broadcasts the new appointment to the clinic dashboard in real time.
    """
    import uuid
    # Normalize fields from any naming convention
    patient_name = (payload.patient_name or payload.name or "Patient").strip().title()
    patient_phone = (payload.patient_phone or payload.phone or payload.phone_number or "+91 98765 43210").strip()
    appt_date = parse_date_flexible(payload.appointment_date or payload.date)
    slot_time = parse_time_flexible(payload.slot_time or payload.time or payload.slot)
    reason = payload.reason_for_visit or payload.reason or "Dental / Medical Consultation"
    sarvam_call_id = payload.sarvam_call_id or payload.call_id or f"sarvam_call_{uuid.uuid4().hex[:8]}"
    doc_name = payload.doctor_name or payload.doctor

    # 1. Resolve Doctor
    doctor = None
    if payload.doctor_id:
        doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    elif doc_name:
        resolved = resolve_target_doctors(doc_name, None, db)
        if resolved:
            doctor = resolved[0]

    if not doctor:
        doctor = db.query(Doctor).filter(Doctor.is_active == True).first()

    if not doctor:
        return SarvamBookAppointmentResponse(
            success=False,
            spoken_confirmation="I apologize, but no active doctors are available right now to take this booking."
        )

    # 2. Check for slot conflict (prevent double booking)
    existing = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.appointment_date == appt_date,
        Appointment.start_time == slot_time,
        Appointment.status.in_(["BOOKED", "RESCHEDULED"])
    ).first()

    if existing:
        time_display = format_12hr_time(slot_time)
        return SarvamBookAppointmentResponse(
            success=False,
            doctor_name=doctor.name,
            appointment_date=appt_date,
            appointment_time=time_display,
            spoken_confirmation=f"I am sorry, the {time_display} slot with {doctor.name} was just booked. Could we choose another time?"
        )

    end_time = compute_end_time(slot_time, doctor.slot_duration_minutes)

    # 3. Create Appointment Record
    new_appointment = Appointment(
        patient_name=patient_name,
        patient_phone=patient_phone,
        doctor_id=doctor.id,
        appointment_date=appt_date,
        start_time=slot_time,
        end_time=end_time,
        status="BOOKED",
        reason_for_visit=reason,
        booked_via="AI_VOICE"
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    # 4. Associate initial CallLog entry with sarvam_call_id
    call_log = db.query(CallLog).filter(CallLog.sarvam_call_id == sarvam_call_id).first()
    if not call_log:
        call_log = CallLog(
            sarvam_call_id=sarvam_call_id,
            appointment_id=new_appointment.id,
            caller_phone=patient_phone,
            call_status="IN_PROGRESS"
        )
        db.add(call_log)
    else:
        call_log.appointment_id = new_appointment.id
    db.commit()

    # 5. Broadcast to connected Clinic Dashboard clients via WebSocket
    broadcast_data = {
        "id": new_appointment.id,
        "patient_name": new_appointment.patient_name,
        "patient_phone": new_appointment.patient_phone,
        "doctor_id": doctor.id,
        "doctor_name": doctor.name,
        "doctor_department": doctor.department,
        "appointment_date": new_appointment.appointment_date,
        "start_time": new_appointment.start_time,
        "end_time": new_appointment.end_time,
        "status": new_appointment.status,
        "reason_for_visit": new_appointment.reason_for_visit,
        "booked_via": new_appointment.booked_via,
        "sarvam_call_id": sarvam_call_id,
        "created_at": new_appointment.created_at.isoformat()
    }
    await realtime_manager.broadcast("appointment:created", broadcast_data)

    # Format human-friendly time (e.g. 11:30 AM) & date (e.g. 30 October)
    try:
        time_obj = datetime.strptime(slot_time, "%H:%M")
        formatted_time = time_obj.strftime("%I:%M %p").lstrip("0")
    except Exception:
        formatted_time = slot_time

    try:
        date_obj = datetime.strptime(appt_date, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%d %B %Y")
    except Exception:
        formatted_date = appt_date

    spoken = (
        f"Thank you, {patient_name}. Your appointment with {doctor.name} "
        f"is confirmed for {formatted_date} at {formatted_time}. "
        f"We have sent you a confirmation SMS."
    )

    return SarvamBookAppointmentResponse(
        success=True,
        appointment_id=new_appointment.id,
        appointment_date=formatted_date,
        appointment_time=formatted_time,
        doctor_name=doctor.name,
        patient_name=patient_name,
        spoken_confirmation=spoken,
        details=broadcast_data
    )

# -------------------------------------------------------------
# TOOL 3: LOOKUP APPOINTMENTS BY CALLER PHONE
# -------------------------------------------------------------
@router.post("/voice/lookup", response_model=SarvamLookupResponse)
def lookup_appointment_voice(
    payload: SarvamLookupRequest,
    db: Session = Depends(get_db)
):
    """
    Called when caller wants to check, cancel, or reschedule an existing appointment.
    """
    clean_phone = payload.phone_number.strip()
    appointments = db.query(Appointment).join(Doctor).filter(
        Appointment.patient_phone.like(f"%{clean_phone[-10:]}%"),
        Appointment.status.in_(["BOOKED", "RESCHEDULED"])
    ).order_by(Appointment.appointment_date.asc()).all()

    if not appointments:
        return SarvamLookupResponse(
            found=False,
            appointments=[],
            spoken_summary="I couldn't find any upcoming active appointments for this phone number."
        )

    appt_list = []
    for a in appointments:
        appt_list.append({
            "id": a.id,
            "doctor_name": a.doctor.name,
            "date": a.appointment_date,
            "time": a.start_time,
            "status": a.status
        })

    first = appt_list[0]
    spoken = (
        f"You have an upcoming appointment with {first['doctor_name']} on {first['date']} at {first['time']}. "
        f"Would you like to keep, reschedule, or cancel this booking?"
    )

    return SarvamLookupResponse(
        found=True,
        appointments=appt_list,
        spoken_summary=spoken
    )

# -------------------------------------------------------------
# TOOL 4: CANCEL APPOINTMENT VIA VOICE
# -------------------------------------------------------------
@router.post("/voice/cancel", response_model=SarvamVoiceActionResponse)
async def cancel_appointment_voice(
    appointment_id: str = Query(...),
    reason: Optional[str] = Query("Cancelled by patient via AI Voice Receptionist"),
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        return SarvamVoiceActionResponse(
            success=False,
            spoken_response="I could not find the appointment to cancel."
        )

    appt.status = "CANCELLED"
    appt.cancellation_reason = reason
    db.commit()

    await realtime_manager.broadcast("appointment:cancelled", {
        "id": appt.id,
        "patient_name": appt.patient_name,
        "status": "CANCELLED",
        "cancellation_reason": reason
    })

    return SarvamVoiceActionResponse(
        success=True,
        spoken_response="Your appointment has been cancelled. Please let us know if you would like to book for another day."
    )

# -------------------------------------------------------------
# WEBHOOK: POST-CALL INGESTION (TRANSCRIPT & AUDIO RECORDING)
# -------------------------------------------------------------
@router.post("/sarvam/webhook/call-ended")
async def sarvam_call_ended_webhook(
    payload: SarvamCallEndedWebhookPayload,
    db: Session = Depends(get_db)
):
    """
    Sarvam Samvaad calls this webhook immediately after a telephony call ends.
    It receives the full transcript, audio recording URL, duration, and metrics.
    """
    logger.info(f"Received Sarvam Post-Call Webhook for Call ID: {payload.call_id}")

    # Look up existing CallLog or create new
    call_log = db.query(CallLog).filter(CallLog.sarvam_call_id == payload.call_id).first()
    
    if not call_log:
        # Check if an appointment was created with this caller's phone today
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        matched_appt = db.query(Appointment).filter(
            Appointment.patient_phone.like(f"%{payload.caller_phone[-10:]}%"),
            Appointment.appointment_date >= today_str
        ).order_by(Appointment.created_at.desc()).first()

        call_log = CallLog(
            sarvam_call_id=payload.call_id,
            appointment_id=matched_appt.id if matched_appt else None,
            caller_phone=payload.caller_phone,
            duration_seconds=payload.duration_seconds,
            call_status=payload.call_status,
            recording_url=payload.recording_url,
            transcript=payload.transcript,
            ai_summary=payload.ai_summary,
            sentiment=payload.sentiment
        )
        db.add(call_log)
    else:
        call_log.duration_seconds = payload.duration_seconds
        call_log.call_status = payload.call_status
        call_log.recording_url = payload.recording_url
        call_log.transcript = payload.transcript
        call_log.ai_summary = payload.ai_summary
        call_log.sentiment = payload.sentiment

    db.commit()
    db.refresh(call_log)

    # Broadcast event to update the dashboard drawer & audio badge
    await realtime_manager.broadcast("call:transcript_ready", {
        "call_id": payload.call_id,
        "appointment_id": call_log.appointment_id,
        "caller_phone": payload.caller_phone,
        "duration_seconds": payload.duration_seconds,
        "recording_url": payload.recording_url,
        "has_recording": bool(payload.recording_url),
        "transcript": payload.transcript,
        "ai_summary": payload.ai_summary
    })

    return {"status": "success", "message": "Call log and transcript ingested successfully"}
