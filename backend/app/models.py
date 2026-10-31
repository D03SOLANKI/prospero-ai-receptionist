import uuid
from datetime import datetime, date, time
from sqlalchemy import Column, String, Integer, Boolean, Date, Time, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return uuid.uuid4().hex[:12]

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    specialization = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    slot_duration_minutes = Column(Integer, default=30)
    working_start_time = Column(String(10), default="09:00")  # HH:MM format
    working_end_time = Column(String(10), default="17:00")    # HH:MM format
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    patient_name = Column(String(150), nullable=False)
    patient_phone = Column(String(20), nullable=False)
    doctor_id = Column(String(50), ForeignKey("doctors.id"), nullable=False)
    
    appointment_date = Column(String(10), nullable=False) # YYYY-MM-DD
    start_time = Column(String(10), nullable=False)       # HH:MM
    end_time = Column(String(10), nullable=False)         # HH:MM
    
    status = Column(String(30), default="BOOKED")         # BOOKED, PENDING, CANCELLED, RESCHEDULED, COMPLETED
    reason_for_visit = Column(Text, nullable=True)
    booked_via = Column(String(30), default="AI_VOICE")   # AI_VOICE, MANUAL_ADMIN, WALK_IN
    cancellation_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = relationship("Doctor", back_populates="appointments")
    call_log = relationship("CallLog", back_populates="appointment", uselist=False)

class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    sarvam_call_id = Column(String(100), unique=True, nullable=False, index=True)
    appointment_id = Column(String(50), ForeignKey("appointments.id"), nullable=True)
    caller_phone = Column(String(20), nullable=False)
    duration_seconds = Column(Integer, default=0)
    call_status = Column(String(50), default="COMPLETED") # COMPLETED, DROPPED, FAILED
    recording_url = Column(Text, nullable=True)
    transcript = Column(JSON, nullable=True) # list of {speaker: "agent"|"patient", text: "...", timestamp: "..."}
    ai_summary = Column(Text, nullable=True)
    sentiment = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="call_log")
