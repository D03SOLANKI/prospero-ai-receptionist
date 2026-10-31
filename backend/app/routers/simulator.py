import uuid
import random
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Doctor, Appointment, CallLog
from app.websocket_manager import realtime_manager
from app.routers.sarvam_voice import compute_end_time, format_12hr_time, PROSPERO_ALL_SLOTS, IST

router = APIRouter(prefix="/api/v1/simulator", tags=["Sarvam Voice Receptionist Call Simulator"])

SIMULATED_PATIENTS = [
    {
        "name": "Devansh Trivedi",
        "phone": "+91 98791 22334",
        "reason": "Severe lower molar pain - Root canal consultation with Dr. Himanshu",
        "lang": "hi",
        "patient_line": "Namaste Neha ji, mere daant me bohot tez dard ho raha hai. Dr. Himanshu Oberoi se root canal checkup karwana hai.",
        "confirm_line": "Haanji please confirm kar dijiye. Mera naam Devansh Trivedi hai."
    },
    {
        "name": "Suresh Gowda",
        "phone": "+91 98450 88776",
        "reason": "Dental implant and zirconia crown evaluation",
        "lang": "kn",
        "patient_line": "Namaskara Neha, mane dental implant matthu ceramic cap bagge Dr. Himanshu jothe appointment bekaagittu.",
        "confirm_line": "Haudu, please book maadi. Nanna hesaru Suresh Gowda."
    },
    {
        "name": "Kavya Patel",
        "phone": "+91 99044 11223",
        "reason": "Child pediatric dental checkup & fluoride treatment",
        "lang": "en",
        "patient_line": "Hello Neha, I need to bring my 6-year-old daughter for a pediatric dental checkup with Dr. Himanshu Oberoi.",
        "confirm_line": "Yes please, that time works wonderfully. My name is Kavya Patel."
    },
    {
        "name": "Pooja Vaghela",
        "phone": "+91 98980 55443",
        "reason": "Ultrasonic teeth cleaning, scaling and aesthetic smile checkup",
        "lang": "hi",
        "patient_line": "Namaste, mujhe routine teeth scaling aur cleaning karwani hai. Aaj kaun sa slot khali hai?",
        "confirm_line": "Ji theek hai, mera naam Pooja Vaghela hai. Book kar dijiye."
    }
]

@router.post("/simulate-call")
async def simulate_sarvam_call(
    scenario: Optional[str] = "new_booking",
    doctor_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Simulates a live Sarvam Samvaad AI Voice Receptionist call with Neha for
    Prospero Microscopic Dental Clinic & Implant Centre.
    """
    patient = random.choice(SIMULATED_PATIENTS)
    call_id = f"sarvam_call_{uuid.uuid4().hex[:10]}"
    
    # Select doctor (defaults to Dr. Himanshu Oberoi)
    if doctor_id:
        doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    else:
        doc = db.query(Doctor).filter(Doctor.is_active == True).first()

    if not doc:
        raise HTTPException(status_code=400, detail="No active doctor found to simulate booking.")

    today_str = (datetime.utcnow() + IST).strftime("%Y-%m-%d")
    
    # Dynamically find a truly free slot for this doctor today from Prospero clinic slots
    booked_slots = {
        b[0] for b in db.query(Appointment.start_time).filter(
            Appointment.doctor_id == doc.id,
            Appointment.appointment_date == today_str,
            Appointment.status.in_(["BOOKED", "RESCHEDULED"])
        ).all()
    }
    
    free_slots = [s for s in PROSPERO_ALL_SLOTS if s not in booked_slots]
    if free_slots:
        chosen_slot = random.choice(free_slots)
    else:
        tomorrow_str = (datetime.utcnow() + IST + timedelta(days=1)).strftime("%Y-%m-%d")
        today_str = tomorrow_str
        chosen_slot = "10:30"

    end_time = compute_end_time(chosen_slot, doc.slot_duration_minutes)
    time_display = format_12hr_time(chosen_slot)

    # 1. Create Appointment
    new_appt = Appointment(
        patient_name=patient["name"],
        patient_phone=patient["phone"],
        doctor_id=doc.id,
        appointment_date=today_str,
        start_time=chosen_slot,
        end_time=end_time,
        status="BOOKED",
        reason_for_visit=patient["reason"],
        booked_via="AI_VOICE"
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    # 2. Generate Turn-by-Turn Transcript matching Neha's real prompt & greeting
    if patient["lang"] == "kn":
        simulated_transcript = [
            {
                "speaker": "agent",
                "text": "Namaskara! Prospero Dental Clinic & Implant Centre inda Neha mathadthiddini. Naanu nimage hege sahayavagali?",
                "timestamp": "00:02"
            },
            {
                "speaker": "patient",
                "text": patient["patient_line"],
                "timestamp": "00:09"
            },
            {
                "speaker": "agent",
                "text": f"Dr. Himanshu Oberoi ivattu {time_display} ge labhyaviruttare. Naanu nimma appointment book madla?",
                "timestamp": "00:17"
            },
            {
                "speaker": "patient",
                "text": patient["confirm_line"],
                "timestamp": "00:23"
            },
            {
                "speaker": "agent",
                "text": f"Dhanyavadagalu! Nimma appointment {today_str} dina {time_display} ge Dr. Himanshu Oberoi jothe yashasviyagi book aagide. Prospero Dental Clinic ge swagatha!",
                "timestamp": "00:32"
            }
        ]
    elif patient["lang"] == "en":
        simulated_transcript = [
            {
                "speaker": "agent",
                "text": "Hello! This is Neha from Prospero Dental Clinic & Implant Centre. How may I help you today?",
                "timestamp": "00:02"
            },
            {
                "speaker": "patient",
                "text": patient["patient_line"],
                "timestamp": "00:08"
            },
            {
                "speaker": "agent",
                "text": f"Dr. Himanshu Oberoi has an open slot today at {time_display}. Would you like me to book it for you?",
                "timestamp": "00:16"
            },
            {
                "speaker": "patient",
                "text": patient["confirm_line"],
                "timestamp": "00:22"
            },
            {
                "speaker": "agent",
                "text": f"Your appointment has been successfully booked for today at {time_display} with Dr. Himanshu Oberoi. See you at Earth Essence, Thaltej!",
                "timestamp": "00:31"
            }
        ]
    else:
        simulated_transcript = [
            {
                "speaker": "agent",
                "text": "Namaste! Prospero Dental Clinic & Implant Centre se Neha bol rahi hoon. Main aapki kaise sahayata kar sakti hoon?",
                "timestamp": "00:02"
            },
            {
                "speaker": "patient",
                "text": patient["patient_line"],
                "timestamp": "00:09"
            },
            {
                "speaker": "agent",
                "text": f"Dr. Himanshu Oberoi aaj {time_display} par available hain. Kya main yeh slot aapke liye book kar doon?",
                "timestamp": "00:17"
            },
            {
                "speaker": "patient",
                "text": patient["confirm_line"],
                "timestamp": "00:24"
            },
            {
                "speaker": "agent",
                "text": f"Ji {patient['name']} ji, aapka appointment Dr. Himanshu Oberoi ke sath aaj {time_display} par successfully book ho gaya hai. Prospero Dental Clinic Thaltej me milte hain!",
                "timestamp": "00:34"
            }
        ]

    summary_text = f"Neha booked consultation for {patient['name']} with Dr. Himanshu Oberoi for {patient['reason']} at {time_display}."

    # 3. Create Call Log with recording & transcript
    call_log = CallLog(
        sarvam_call_id=call_id,
        appointment_id=new_appt.id,
        caller_phone=patient["phone"],
        duration_seconds=36,
        call_status="COMPLETED",
        recording_url="https://actions.google.com/sounds/v1/telecom/phone_dialing_us.ogg",
        transcript=simulated_transcript,
        ai_summary=summary_text,
        sentiment="Positive"
    )
    db.add(call_log)
    db.commit()
    db.refresh(call_log)

    # 4. Broadcast real-time events to connected clinic dashboards
    broadcast_data = {
        "id": new_appt.id,
        "patient_name": new_appt.patient_name,
        "patient_phone": new_appt.patient_phone,
        "doctor_id": doc.id,
        "doctor_name": doc.name,
        "doctor_department": doc.department,
        "appointment_date": new_appt.appointment_date,
        "start_time": new_appt.start_time,
        "end_time": new_appt.end_time,
        "status": new_appt.status,
        "reason_for_visit": new_appt.reason_for_visit,
        "booked_via": new_appt.booked_via,
        "has_call_recording": True,
        "has_transcript": True,
        "sarvam_call_id": call_id,
        "created_at": new_appt.created_at.isoformat()
    }
    
    await realtime_manager.broadcast("appointment:created", broadcast_data)
    await realtime_manager.broadcast("call:transcript_ready", {
        "call_id": call_id,
        "appointment_id": new_appt.id,
        "caller_phone": patient["phone"],
        "recording_url": call_log.recording_url,
        "transcript": simulated_transcript,
        "ai_summary": call_log.ai_summary
    })

    return {
        "status": "success",
        "message": f"Simulated call with Neha completed! Booked {patient['name']} at {time_display}.",
        "appointment": broadcast_data,
        "transcript": simulated_transcript
    }
