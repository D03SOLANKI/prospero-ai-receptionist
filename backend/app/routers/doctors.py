from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Doctor, Appointment
from app.schemas import DoctorResponse, DoctorOccupancy, DoctorBase
from app.routers.sarvam_voice import generate_prospero_slots, format_12hr_time, IST

router = APIRouter(prefix="/api/v1/doctors", tags=["Doctors Management & Schedules"])

@router.get("", response_model=List[DoctorOccupancy])
def get_doctors_with_occupancy(
    date: Optional[str] = Query(None, description="Date for occupancy calculation (default today)"),
    db: Session = Depends(get_db)
):
    target_date = date or (datetime.utcnow() + IST).strftime("%Y-%m-%d")
    doctors = db.query(Doctor).filter(Doctor.is_active == True).all()

    results = []
    for doc in doctors:
        all_slots = generate_prospero_slots(target_date)
        total_slots = len(all_slots)
        
        booked_count = db.query(Appointment).filter(
            Appointment.doctor_id == doc.id,
            Appointment.appointment_date == target_date,
            Appointment.status.in_(["BOOKED", "RESCHEDULED", "PENDING"])
        ).count()

        occupancy_pct = round((booked_count / total_slots * 100), 1) if total_slots > 0 else 0.0

        results.append(DoctorOccupancy(
            id=doc.id,
            name=doc.name,
            specialization=doc.specialization,
            department=doc.department,
            phone=doc.phone,
            slot_duration_minutes=doc.slot_duration_minutes,
            working_start_time=doc.working_start_time,
            working_end_time=doc.working_end_time,
            is_active=doc.is_active,
            created_at=doc.created_at,
            total_slots_today=total_slots,
            booked_slots_today=booked_count,
            occupancy_percentage=occupancy_pct
        ))

    return results

@router.get("/{doctor_id}/slots")
def get_doctor_slots_for_date(
    doctor_id: str,
    date: str = Query(..., description="Date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    all_slots = generate_prospero_slots(date)
    
    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doc.id,
        Appointment.appointment_date == date,
        Appointment.status.in_(["BOOKED", "RESCHEDULED", "PENDING"])
    ).all()
    
    booked_map = {a.start_time: a for a in appointments}

    slots_details = []
    for s in all_slots:
        formatted = format_12hr_time(s)
        if s in booked_map:
            appt = booked_map[s]
            slots_details.append({
                "time": s,
                "display_time": formatted,
                "is_available": False,
                "appointment_id": appt.id,
                "patient_name": appt.patient_name,
                "status": appt.status
            })
        else:
            slots_details.append({
                "time": s,
                "display_time": formatted,
                "is_available": True,
                "appointment_id": None,
                "patient_name": None,
                "status": "AVAILABLE"
            })

    return {
        "doctor_id": doc.id,
        "doctor_name": doc.name,
        "date": date,
        "slots": slots_details
    }
