from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.database import get_db
from app.models import Appointment, Doctor, CallLog
from app.schemas import (
    AppointmentResponse, AppointmentDetailResponse, AppointmentCreate,
    AppointmentRescheduleRequest, AppointmentCancelRequest,
    CalendarEventResponse, DashboardStatsResponse
)
from app.websocket_manager import realtime_manager

router = APIRouter(prefix="/api/v1/appointments", tags=["Dashboard Appointments Management"])

def format_appointment_response(appt: Appointment) -> dict:
    has_recording = False
    has_transcript = False
    sarvam_call_id = None
    if appt.call_log:
        has_recording = bool(appt.call_log.recording_url)
        has_transcript = bool(appt.call_log.transcript)
        sarvam_call_id = appt.call_log.sarvam_call_id

    return {
        "id": appt.id,
        "patient_name": appt.patient_name,
        "patient_phone": appt.patient_phone,
        "doctor_id": appt.doctor_id,
        "doctor_name": appt.doctor.name if appt.doctor else "Unassigned",
        "doctor_department": appt.doctor.department if appt.doctor else "General",
        "appointment_date": appt.appointment_date,
        "start_time": appt.start_time,
        "end_time": appt.end_time,
        "status": appt.status,
        "reason_for_visit": appt.reason_for_visit,
        "booked_via": appt.booked_via,
        "cancellation_reason": appt.cancellation_reason,
        "has_call_recording": has_recording,
        "has_transcript": has_transcript,
        "sarvam_call_id": sarvam_call_id,
        "created_at": appt.created_at,
        "updated_at": appt.updated_at
    }

# -------------------------------------------------------------
# GET APPOINTMENTS LIST WITH FILTERING & SEARCH
# -------------------------------------------------------------
@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    doctor_id: Optional[str] = Query(None, description="Filter by doctor UUID"),
    date_from: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    status: Optional[str] = Query(None, description="BOOKED, PENDING, CANCELLED, RESCHEDULED"),
    search: Optional[str] = Query(None, description="Search by patient name or phone"),
    sort_by: Optional[str] = Query("newest", description="newest (by created_at) or slot_time"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment).join(Doctor, isouter=True)

    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if date_from:
        query = query.filter(Appointment.appointment_date >= date_from)
    if date_to:
        query = query.filter(Appointment.appointment_date <= date_to)
    if status and status.upper() != "ALL":
        query = query.filter(Appointment.status == status.upper())
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Appointment.patient_name.ilike(search_term),
                Appointment.patient_phone.like(search_term),
                Doctor.name.ilike(search_term)
            )
        )

    if sort_by == "slot_time":
        query = query.order_by(
            Appointment.appointment_date.desc(),
            Appointment.start_time.asc()
        )
    else:
        # Default: newest bookings first so AI Voice receptionist bookings always pop right to the top!
        query = query.order_by(Appointment.created_at.desc())

    appointments = query.offset(offset).limit(limit).all()

    return [format_appointment_response(a) for a in appointments]

# -------------------------------------------------------------
# CLEAR ALL APPOINTMENTS & CALL LOGS (FOR FRESH TESTING)
# -------------------------------------------------------------
@router.delete("/clear-all")
async def clear_all_appointments(db: Session = Depends(get_db)):
    db.query(CallLog).delete()
    db.query(Appointment).delete()
    db.commit()
    await realtime_manager.broadcast("appointments:cleared", {})
    return {"status": "success", "message": "All appointments and call logs have been cleared"}
@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    total = db.query(Appointment).count()
    today = db.query(Appointment).filter(Appointment.appointment_date == today_str).count()
    booked = db.query(Appointment).filter(Appointment.status == "BOOKED").count()
    rescheduled = db.query(Appointment).filter(Appointment.status == "RESCHEDULED").count()
    cancelled = db.query(Appointment).filter(Appointment.status == "CANCELLED").count()
    ai_booked = db.query(Appointment).filter(Appointment.booked_via == "AI_VOICE").count()
    manual_booked = db.query(Appointment).filter(Appointment.booked_via != "AI_VOICE").count()
    active_doctors = db.query(Doctor).filter(Doctor.is_active == True).count()

    return DashboardStatsResponse(
        total_appointments=total,
        today_appointments=today,
        booked_count=booked,
        rescheduled_count=rescheduled,
        cancelled_count=cancelled,
        ai_booked_count=ai_booked,
        manual_booked_count=manual_booked,
        active_doctors=active_doctors
    )

# -------------------------------------------------------------
# CALENDAR EVENTS FEED (DAY / WEEK / MONTH)
# -------------------------------------------------------------
@router.get("/calendar/events", response_model=List[CalendarEventResponse])
def get_calendar_events(
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    doctor_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment).join(Doctor)
    if start_date:
        query = query.filter(Appointment.appointment_date >= start_date)
    if end_date:
        query = query.filter(Appointment.appointment_date <= end_date)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)

    # Status color mapping
    status_colors = {
        "BOOKED": "#2563EB",       # Blue
        "RESCHEDULED": "#9333EA",  # Purple
        "CANCELLED": "#EF4444",    # Red
        "COMPLETED": "#10B981",    # Green
        "PENDING": "#F59E0B"       # Amber
    }

    appointments = query.all()
    events = []
    for a in appointments:
        start_iso = f"{a.appointment_date}T{a.start_time}:00"
        end_iso = f"{a.appointment_date}T{a.end_time}:00"
        title = f"{a.patient_name} - Dr. {a.doctor.name} ({a.status})"

        events.append(CalendarEventResponse(
            id=a.id,
            title=title,
            start=start_iso,
            end=end_iso,
            doctor_id=a.doctor_id,
            doctor_name=a.doctor.name,
            patient_name=a.patient_name,
            patient_phone=a.patient_phone,
            status=a.status,
            color=status_colors.get(a.status, "#6B7280")
        ))
    return events

# -------------------------------------------------------------
# GET APPOINTMENT DETAIL (INCLUDES TRANSCRIPT & RECORDING)
# -------------------------------------------------------------
@router.get("/{appointment_id}", response_model=AppointmentDetailResponse)
def get_appointment_detail(appointment_id: str, db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    base_resp = format_appointment_response(appt)
    return AppointmentDetailResponse(
        **base_resp,
        doctor=appt.doctor,
        call_log=appt.call_log
    )

# -------------------------------------------------------------
# MANUAL BOOKING BY CLINIC ADMIN
# -------------------------------------------------------------
@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db)
):
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Conflict check
    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == payload.doctor_id,
        Appointment.appointment_date == payload.appointment_date,
        Appointment.start_time == payload.start_time,
        Appointment.status.in_(["BOOKED", "RESCHEDULED"])
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="This time slot is already booked for the selected doctor.")

    # Calculate end time
    start_dt = datetime.strptime(payload.start_time, "%H:%M")
    end_dt = start_dt + timedelta(minutes=doctor.slot_duration_minutes)
    end_time_str = end_dt.strftime("%H:%M")

    new_appt = Appointment(
        patient_name=payload.patient_name.title(),
        patient_phone=payload.patient_phone,
        doctor_id=payload.doctor_id,
        appointment_date=payload.appointment_date,
        start_time=payload.start_time,
        end_time=end_time_str,
        status="BOOKED",
        reason_for_visit=payload.reason_for_visit,
        booked_via=payload.booked_via or "MANUAL_ADMIN"
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    resp = format_appointment_response(new_appt)
    await realtime_manager.broadcast("appointment:created", resp)
    return resp

# -------------------------------------------------------------
# RESCHEDULE APPOINTMENT FROM DASHBOARD
# -------------------------------------------------------------
@router.patch("/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    appointment_id: str,
    payload: AppointmentRescheduleRequest,
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    target_doctor_id = payload.doctor_id or appt.doctor_id
    doctor = db.query(Doctor).filter(Doctor.id == target_doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Target doctor not found")

    # Check conflict for new slot
    conflict = db.query(Appointment).filter(
        Appointment.id != appointment_id,
        Appointment.doctor_id == target_doctor_id,
        Appointment.appointment_date == payload.new_date,
        Appointment.start_time == payload.new_time,
        Appointment.status.in_(["BOOKED", "RESCHEDULED"])
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="The selected new slot is already booked.")

    start_dt = datetime.strptime(payload.new_time, "%H:%M")
    end_dt = start_dt + timedelta(minutes=doctor.slot_duration_minutes)

    appt.doctor_id = target_doctor_id
    appt.appointment_date = payload.new_date
    appt.start_time = payload.new_time
    appt.end_time = end_dt.strftime("%H:%M")
    appt.status = "RESCHEDULED"
    appt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(appt)

    resp = format_appointment_response(appt)
    await realtime_manager.broadcast("appointment:rescheduled", resp)
    return resp

# -------------------------------------------------------------
# CANCEL APPOINTMENT FROM DASHBOARD
# -------------------------------------------------------------
@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: str,
    payload: AppointmentCancelRequest,
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = "CANCELLED"
    appt.cancellation_reason = payload.reason
    appt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(appt)

    resp = format_appointment_response(appt)
    await realtime_manager.broadcast("appointment:cancelled", resp)
    return resp

@router.delete("/clear-all")
async def clear_all_appointments(db: Session = Depends(get_db)):
    """Deletes all appointments and call logs for clean test runs."""
    from app.models import CallLog
    db.query(CallLog).delete()
    db.query(Appointment).delete()
    db.commit()
    return {"status": "success", "message": "All appointments cleared"}

