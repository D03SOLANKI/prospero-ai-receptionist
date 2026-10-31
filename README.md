# 🏥 MedPulse Central: Sarvam Samvaad AI Voice Receptionist & Dashboard Integration

A complete, centralized Clinic Appointment Management System integrated with **Sarvam Samvaad AI Voice Receptionist**.

This system allows clinic administrators to monitor, manage, reschedule, and cancel appointments in real-time as patients book them over phone calls with Sarvam's Indic voice agent.

---

## 🌟 Key Capabilities

- **Real-Time Synchronization:** As soon as a patient confirms an appointment over the phone with Sarvam Samvaad AI, the appointment instantly appears on the dashboard via WebSockets without page refreshes.
- **Complete Appointment Details:**
  - Patient Name & Contact Number (with Click-to-Call)
  - Doctor Assigned & Department
  - Appointment Date & Time / Slot
  - Status Lifecycle (`BOOKED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED`, `PENDING`)
  - Reason for Visit
  - Booking Timestamp & Source (`AI Voice Receptionist` vs `Manual Admin`)
- **Call Details & Conversation History Drawer:**
  - Built-in **Web Audio Player** for telephone recording playback
  - Turn-by-turn **bilingual transcript** (Hindi / Hinglish / English) distinguishing `🤖 AI Receptionist` and `👤 Patient` turns
  - AI clinical summary & sentiment analysis
- **Interactive Multi-View Calendar:**
  - Visual Month, Week, and Day views with doctor-coded appointment blocks
- **Doctor Overview & Capacity Analytics:**
  - Real-time daily slot occupancy progress bars (`12/16 slots booked (75%)`)
  - 30-minute slot availability matrix per doctor
- **Appointment Management:**
  - One-click slot rescheduling with conflict prevention
  - Instant cancellation with reason logging (immediately frees up the slot for other callers)
- **Built-in Voice Call Simulator:**
  - Test and verify the full Sarvam tool-calling & webhook cycle directly from the UI without needing active telephony.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Patient Telephony
        P[Patient Phone Call]
    end

    subgraph Sarvam Samvaad AI
        SV[Voice Engine - ASR / Indic LLM / TTS]
        Tools[Function / Tool Calling Layer]
        WH[Post-Call Webhook Dispatcher]
    end

    subgraph Central Backend (FastAPI)
        API[API Gateway: /api/v1]
        SlotLock[Slot Conflict & Atomic Engine]
        WS[WebSocket Manager: /ws/dashboard]
        DB[(SQLite / PostgreSQL)]
    end

    subgraph Clinic Dashboard (Next.js 16 + Tailwind)
        UI_Table[Appointments Table & Compound Filters]
        UI_Cal[Interactive Calendar View]
        UI_Drawer[Call Audio Player & Chat Transcript]
        UI_Docs[Doctor Capacity & Shift Matrix]
    end

    P <-->|Telephony Audio| SV
    SV -->|1. Mid-call Tool Call: check_availability / book| Tools
    Tools -->|HTTP POST| API
    API --> SlotLock
    SlotLock <--> DB
    API -->|2. Real-time Event Broadcast| WS
    WS -->|WebSocket Push| UI_Table
    WS -->|WebSocket Push| UI_Cal
    SV -->|3. Call Ends: Recording & Transcript| WH
    WH -->|POST /webhook/call-ended| API
    API -->|Save Call Log| DB
    API -->|4. Push transcript_ready| WS
    WS --> UI_Drawer
    UI_Table -->|Admin Reschedule / Cancel| API
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm

---

### Step 1: Start the FastAPI Backend

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Mac/Linux:
# source venv/bin/activate

# (Dependencies already installed)
# python -m pip install -r requirements.txt

# Run server with Uvicorn
python run.py
```
> The backend server will start on **`http://localhost:8000`**.  
> Interactive OpenAPI documentation is available at **`http://localhost:8000/docs`**.

---

### Step 2: Start the Next.js Frontend Dashboard

In a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Start Next.js development server
npm run dev
```
> The dashboard will open on **`http://localhost:3000`**.

---

## 🔗 How to Connect Your Sarvam Samvaad AI Agent

To extend your existing Sarvam Samvaad voice receptionist, you do not need to rewrite its core prompt. Simply register the following tools and webhook:

### 1. Mid-Call Function / Tool Schemas

Add the following tool definitions to your Sarvam Samvaad Agent configuration:

#### Tool A: `check_doctor_availability`
```json
{
  "type": "function",
  "function": {
    "name": "check_doctor_availability",
    "description": "Checks available consultation slots for a specific doctor or specialization on a given date.",
    "parameters": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string",
          "description": "Date formatted as YYYY-MM-DD"
        },
        "doctor_name": {
          "type": "string",
          "description": "Name or partial name of the doctor (e.g., 'Sharma', 'Dr. Priya')"
        },
        "specialization": {
          "type": "string",
          "description": "Department or specialization (e.g., 'Cardiology', 'Dermatology')"
        },
        "preferred_time_window": {
          "type": "string",
          "enum": ["morning", "afternoon", "evening"]
        }
      },
      "required": ["date"]
    }
  }
}
```
* **Endpoint URL:** `https://<your-public-url>/api/v1/voice/availability`
* **Method:** `GET`

#### Tool B: `book_appointment`
```json
{
  "type": "function",
  "function": {
    "name": "book_appointment",
    "description": "Atomically locks and books an appointment slot for a patient with a selected doctor.",
    "parameters": {
      "type": "object",
      "properties": {
        "sarvam_call_id": {
          "type": "string",
          "description": "Unique call ID provided by Sarvam telephony"
        },
        "patient_name": {
          "type": "string",
          "description": "Full name of the patient"
        },
        "patient_phone": {
          "type": "string",
          "description": "Caller contact phone number"
        },
        "doctor_name": {
          "type": "string",
          "description": "Doctor name selected by patient"
        },
        "appointment_date": {
          "type": "string",
          "description": "Date formatted as YYYY-MM-DD"
        },
        "slot_time": {
          "type": "string",
          "description": "Slot time formatted as HH:MM in 24-hr format (e.g. '10:00', '16:30')"
        },
        "reason_for_visit": {
          "type": "string",
          "description": "Reason for medical visit or symptoms described by caller"
        }
      },
      "required": ["sarvam_call_id", "patient_name", "patient_phone", "appointment_date", "slot_time"]
    }
  }
}
```
* **Endpoint URL:** `https://<your-public-url>/api/v1/voice/book`
* **Method:** `POST`

#### Tool C: `lookup_patient_appointments`
* **Endpoint URL:** `https://<your-public-url>/api/v1/voice/lookup`
* **Method:** `POST`
* Used when returning patients call asking: *"When is my appointment?"* or *"I need to cancel my booking."*

---

### 2. Post-Call Webhook Setup

In the Sarvam Samvaad telephony settings, configure the **Post-Call Webhook**:
* **Webhook URL:** `https://<your-public-url>/api/v1/sarvam/webhook/call-ended`
* **HTTP Method:** `POST`

**Payload sent by Sarvam:**
```json
{
  "call_id": "sarvam_call_981240",
  "caller_phone": "+91 98765 43210",
  "duration_seconds": 45,
  "call_status": "COMPLETED",
  "recording_url": "https://telephony-storage.sarvam.ai/recordings/call_981240.mp3",
  "transcript": [
    {"speaker": "agent", "text": "Namaste! City Clinic me aapka swagat hai.", "timestamp": "00:02"},
    {"speaker": "patient", "text": "Mujhe Dr. Sharma se consult karna hai.", "timestamp": "00:08"}
  ],
  "ai_summary": "Patient booked routine cardiology checkup.",
  "sentiment": "Positive"
}
```
When this webhook is received, the backend immediately associates the recording and transcript with the appointment and sends a real-time push to the dashboard.

---

### 3. Exposing Localhost to Sarvam (For Local Development)
During development, expose your local backend so Sarvam's cloud servers can reach your machine:
```bash
# Using ngrok:
ngrok http 8000

# Or Cloudflare Tunnel:
cloudflared tunnel --url http://localhost:8000
```
Then paste the generated `https://xyz.ngrok-free.app` URL into the Sarvam Samvaad tool & webhook configurations.

---

## 🧪 Testing the Integration with the Voice Simulator

Don't have an active telephony call right now?
1. Open the dashboard at `http://localhost:3000`.
2. Click the **"Simulate Voice Call"** button in the top navigation bar or go to the **"Sarvam Voice Integration Hub"** tab.
3. Watch the system:
   - Execute the doctor slot locking logic.
   - Deliver the post-call recording and bilingual Hindi/English transcript.
   - Instantly push a real-time toast alert.
   - Dynamically insert the new appointment at the top of the table and place the badge on the calendar.
4. Click on the row to test the **Audio Player** and **Turn-by-Turn Conversation Transcript**!

---

## 📁 Repository Structure

```
Ai Receptionist Dashboard/
├── backend/
│   ├── app/
│   │   ├── config.py             # Server & DB settings
│   │   ├── database.py           # SQLite / SQLAlchemy session
│   │   ├── models.py             # Doctor, Appointment, CallLog models
│   │   ├── schemas.py            # Pydantic schemas & Tool contracts
│   │   ├── websocket_manager.py  # WebSocket real-time broadcaster
│   │   ├── seed_data.py          # Initial doctors, schedules, sample calls
│   │   ├── main.py               # FastAPI app & lifespan setup
│   │   └── routers/
│   │       ├── sarvam_voice.py   # Sarvam Mid-Call Tools & Webhook API
│   │       ├── appointments.py   # Dashboard CRUD, Reschedule, Cancel
│   │       ├── doctors.py        # Doctor schedules & capacity stats
│   │       └── simulator.py      # Voice Call Simulation Engine
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Central Dashboard with Live Tabs
│   │   │   └── globals.css       # Tailwind theme & animations
│   │   ├── components/
│   │   │   ├── Navbar.tsx        # Header & connection indicator
│   │   │   ├── StatsOverview.tsx # KPI summary cards
│   │   │   ├── AppointmentTable.tsx # Searchable, filterable table
│   │   │   ├── CalendarView.tsx  # Month/Week/Day visual calendar
│   │   │   ├── DoctorOverview.tsx# Doctor load & capacity matrix
│   │   │   ├── CallDetailsDrawer.tsx # Audio player & chat transcript
│   │   │   ├── RescheduleModal.tsx   # Slot reschedule modal
│   │   │   ├── CancelModal.tsx       # Cancellation dialog
│   │   │   ├── NewAppointmentModal.tsx # Manual walk-in entry
│   │   │   └── SarvamIntegrationHub.tsx# In-app integration guide & schema
│   │   └── lib/
│   │       ├── api.ts            # Fetch API client
│   │       ├── socket.ts         # Real-time WebSocket connection
│   │       └── types.ts          # TypeScript interfaces
│   ├── package.json
│   └── next.config.ts
└── README.md
```
