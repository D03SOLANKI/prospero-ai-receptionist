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

    today = (datetime.utcnow() + IST).date()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    # Seed initial Appointments & Call Logs with Neha's exact greeting and clinic dialogues
    sample_appointments = [
        (
            doctors[0],
            "Harshil Shah",
            "+91 98765 11223",
            str(today),
            "10:30",
            "11:00",
            "BOOKED",
            "Severe lower molar toothache - Microscopic Root Canal consultation",
            "AI_VOICE",
            "prospero_call_001",
            [
                {"speaker": "agent", "text": "Namaste! Prospero Dental Clinic & Implant Centre se Neha bol rahi hoon. Main aapki kaise sahayata kar sakti hoon?", "timestamp": "00:02"},
                {"speaker": "patient", "text": "Namaste Neha ji, mujhe molar tooth me bohot dard hai. Dr. Himanshu se consult karna hai.", "timestamp": "00:09"},
                {"speaker": "agent", "text": "Dr. Himanshu Oberoi aaj subah 10:30 AM par available hain. Kya main yeh slot aapke liye book kar doon?", "timestamp": "00:16"},
                {"speaker": "patient", "text": "Ji bilkul, mera naam Harshil Shah hai.", "timestamp": "00:22"},
                {"speaker": "agent", "text": "Ji Harshil ji, aapka appointment 10:30 AM par confirm ho gaya hai. Prospero Dental Clinic, 3rd Floor Earth Essence, Thaltej me aapka swagat hai.", "timestamp": "00:30"}
            ],
            "Patient called with severe molar pain. Neha confirmed 10:30 AM root canal consultation with Dr. Himanshu Oberoi."
        ),
        (
            doctors[1],
            "Suresh Gowda",
            "+91 98450 88776",
            str(today),
            "11:30",
            "12:00",
            "BOOKED",
            "Dental implant evaluation and ceramic crown fixing",
            "AI_VOICE",
            "prospero_call_002",
            [
                {"speaker": "agent", "text": "Namaskara! Prospero Dental Clinic & Implant Centre inda Neha mathadthiddini. Naanu nimage hege sahayavagali?", "timestamp": "00:02"},
                {"speaker": "patient", "text": "Namaskara Neha, mane dental implant matthu ceramic cap bagge Dr. Himanshu jothe appointment bekaagittu.", "timestamp": "00:08"},
                {"speaker": "agent", "text": "Dr. Himanshu Oberoi ivattu beligge 11:30 AM ge labhyaviruttare. Naanu nimma appointment book madla?", "timestamp": "00:15"},
                {"speaker": "patient", "text": "Haudu, book maadi. Nanna hesaru Suresh Gowda.", "timestamp": "00:20"},
                {"speaker": "agent", "text": "Dhanyavadagalu Suresh avare! Nimma appointment ivattu 11:30 AM ge yashasviyagi book aagide. Prospero Dental Clinic ge swagatha!", "timestamp": "00:28"}
            ],
            "Patient inquired in Kannada regarding dental implants. Neha booked 11:30 AM consultation with Dr. Himanshu Oberoi."
        ),
        (
            doctors[2],
            "Ananya Joshi",
            "+91 98330 67890",
            str(today),
            "16:30",
            "17:00",
            "BOOKED",
            "Pediatric dental checkup for 7-year-old & cavity inspection",
            "AI_VOICE",
            "prospero_call_003",
            [
                {"speaker": "agent", "text": "Hello! This is Neha from Prospero Dental Clinic & Implant Centre. How may I help you today?", "timestamp": "00:02"},
                {"speaker": "patient", "text": "Hi Neha, I need to bring my 7-year-old daughter for a dental checkup and cavity filling.", "timestamp": "00:08"},
                {"speaker": "agent", "text": "Dr. Himanshu Oberoi has an open evening slot today at 4:30 PM. Would you like me to book that for you?", "timestamp": "00:15"},
                {"speaker": "patient", "text": "Yes please, that time is perfect.", "timestamp": "00:20"},
                {"speaker": "agent", "text": "Your appointment has been successfully booked for today at 4:30 PM. See you at Earth Essence, Hebatpur Road!", "timestamp": "00:28"}
            ],
            "Pediatric checkup booked for 4:30 PM evening shift with Dr. Himanshu Oberoi."
        ),
        (
            doctors[3],
            "Pooja Trivedi",
            "+91 98440 98765",
            str(tomorrow),
            "10:00",
            "10:30",
            "BOOKED",
            "Teeth ultrasonic scaling, cleaning & aesthetic smile polishing",
            "MANUAL_ADMIN",
            None,
            None,
            None
        )
    ]

    for (doc, p_name, p_phone, a_date, s_time, e_time, status, reason, channel, call_id, transcript, summary) in sample_appointments:
        appt = Appointment(
            patient_name=p_name,
            patient_phone=p_phone,
            doctor_id=doc.id,
            appointment_date=a_date,
            start_time=s_time,
            end_time=e_time,
            status=status,
            reason_for_visit=reason,
            booked_via=channel
        )
        db.add(appt)
        db.commit()
        db.refresh(appt)

        if call_id:
            c_log = CallLog(
                sarvam_call_id=call_id,
                appointment_id=appt.id,
                caller_phone=p_phone,
                duration_seconds=38,
                call_status="COMPLETED",
                recording_url="https://actions.google.com/sounds/v1/telecom/phone_dialing_us.ogg",
                transcript=transcript,
                ai_summary=summary,
                sentiment="Positive"
            )
            db.add(c_log)
            db.commit()

    db.close()
