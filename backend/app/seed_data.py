from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import Doctor, Appointment, CallLog

IST = timedelta(hours=5, minutes=30)

def init_db(force: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if force:
        db.query(CallLog).delete()
        db.query(Appointment).delete()
        db.query(Doctor).delete()
        db.commit()

    if db.query(Doctor).count() > 0:
        db.close()
        return

    # Seed Doctors for Prospero Microscopic Dental Clinic & Implant Centre
    # Clinic Location: Thaltej, Ahmedabad, Gujarat · Phone: +91 72840 49597
    # Hours: Mon-Sat 10:00 AM – 1:30 PM & 4:00 PM – 8:00 PM (Closed Sunday)
    doctors = [
        Doctor(
            name="Dr. Himanshu Oberoi",
            specialization="Microscopic Endodontics & Dental Implants",
            department="Endodontics & Implantology",
            phone="+91 72840 49597",
            slot_duration_minutes=30,
            working_start_time="10:00",
            working_end_time="20:00"
        ),
        Doctor(
            name="Dr. Himanshu Oberoi (Full Mouth Rehab)",
            specialization="Full Mouth Rehabilitation & Prosthetics",
            department="Full Mouth Rehabilitation",
            phone="+91 72840 49597",
            slot_duration_minutes=30,
            working_start_time="10:00",
            working_end_time="20:00"
        ),
        Doctor(
            name="Dr. Himanshu Oberoi (Pediatric Dental)",
            specialization="Pediatric & Preventive Dentistry",
            department="Pediatric Dentistry",
            phone="+91 72840 49597",
            slot_duration_minutes=30,
            working_start_time="10:00",
            working_end_time="20:00"
        ),
        Doctor(
            name="Dr. Himanshu Oberoi (General & Aesthetic)",
            specialization="General Dentistry, Scaling & Smile Design",
            department="General Dentistry",
            phone="+91 72840 49597",
            slot_duration_minutes=30,
            working_start_time="10:00",
            working_end_time="20:00"
        )
    ]
    db.add_all(doctors)
    db.commit()

    for doc in doctors:
        db.refresh(doc)

    # Doctors initialized. No demo appointments seeded.
    db.close()
