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

    # Clean up any extra doctor tracks, keep only the single main Dr. Himanshu Oberoi
    extra_docs = db.query(Doctor).filter(Doctor.name != "Dr. Himanshu Oberoi").all()
    if extra_docs:
        for d in extra_docs:
            db.delete(d)
        db.commit()

    main_doc = db.query(Doctor).filter(Doctor.name == "Dr. Himanshu Oberoi").first()
    if not main_doc:
        main_doc = Doctor(
            name="Dr. Himanshu Oberoi",
            specialization="Microscopic Endodontics & Dental Implants",
            department="Endodontics & Implantology",
            phone="+91 72840 49597",
            slot_duration_minutes=30,
            working_start_time="10:00",
            working_end_time="20:00"
        )
        db.add(main_doc)
        db.commit()
    else:
        # Update details to ensure clean specialty
        main_doc.specialization = "Microscopic Endodontics & Dental Implants"
        main_doc.department = "Endodontics & Implantology"
        db.commit()

    db.close()
