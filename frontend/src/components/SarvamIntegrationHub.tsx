'use client';

import React, { useState } from 'react';
import { Bot, Copy, Check, Sparkles, Terminal, PhoneForwarded, Radio, FileCode2, ExternalLink, ShieldCheck } from 'lucide-react';
import { Doctor } from '../lib/types';

interface SarvamIntegrationHubProps {
  doctors: Doctor[];
  onSimulateCall: (doctorId?: string) => void;
  isSimulating: boolean;
}

export const SarvamIntegrationHub: React.FC<SarvamIntegrationHubProps> = ({
  doctors,
  onSimulateCall,
  isSimulating
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const LIVE_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://prospero-ai-receptionist.onrender.com/api/v1').replace(/\/api\/v1\/?$/, '');

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const endpoints = [
    {
      title: 'Tool 1: check_availability (Mid-Call)',
      method: 'POST',
      url: `${LIVE_BASE}/api/v1/voice/check-availability`,
      section3: `Use the API response to tell the caller about available appointment slots.

If "is_available" is true:
- Tell the caller the available slots from "slots_text".
- Ask the caller which of these times works best for them.

If "is_available" is false:
- Tell the caller that the requested time is not available.
- Offer the available alternative slots from "slots_text".`,
      desc: "Invoked when caller asks for appointment slots. Returns available 30-min slots for Dr. Himanshu Oberoi for both morning (10:00-1:30) and evening (4:00-8:00) shifts."
    },
    {
      title: 'Tool 2: create_appointment (Mid-Call)',
      method: 'POST',
      url: `${LIVE_BASE}/api/v1/voice/create-appointment`,
      section3: `Use the API response to determine whether the appointment was successfully booked.

If "success" is true:
- Tell the caller that the appointment has been successfully booked.
- Mention the appointment date from "appointment_date".
- Mention the appointment time from "appointment_time".

If "success" is false:
- Apologize briefly and inform the caller that the slot is already taken.
- Offer to pick another available time.`,
      desc: "Invoked when caller confirms patient name, phone, date, and slot time. Confirms the dental booking and pushes instant live update to this dashboard."
    },
    {
      title: 'Post-Call Telephony Webhook (Audio & Transcripts)',
      method: 'POST',
      url: `${LIVE_BASE}/api/v1/sarvam/webhook/call-ended`,
      section3: `Sends full turn-by-turn conversation transcript, call_summary, duration_seconds, and recording_url to the dashboard.`,
      desc: "Automatically invoked by Sarvam when the call finishes. Ingests Neha's call transcript and audio recording."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-xs font-semibold text-teal-200 mb-3">
            <Radio className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
            <span>Prospero Dental Clinic · Sarvam Samvaad Live Bridge</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            AI Voice Receptionist (Neha) Integration Hub
          </h2>
          <p className="text-xs text-teal-100/90 mt-2 leading-relaxed">
            Neha connects mid-call to check availability and create appointments for Dr. Himanshu Oberoi. When a call concludes, Sarvam pushes transcripts and audio to the webhook below, updating this dashboard in real-time over WebSockets.
          </p>

          <div className="mt-5 flex items-center space-x-3">
            <button
              onClick={() => onSimulateCall(selectedDoctorId || undefined)}
              disabled={isSimulating}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{isSimulating ? 'Processing Neha Call...' : 'Test Simulated Voice Call'}</span>
            </button>
            <span className="text-xs text-teal-300">
              ⚡ Instant turn-by-turn simulation without telephony credits
            </span>
          </div>
        </div>
      </div>

      {/* Endpoints & Configuration Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Active Production Endpoints (Paste in Sarvam Samvaad)</span>
          </h3>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Render 24/7 Cloud Active
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {endpoints.map((ep, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{ep.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{ep.desc}</p>
                </div>
                <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-teal-100 text-teal-800">
                  {ep.method}
                </span>
              </div>

              {/* Endpoint URL with Copy Button */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Tool Endpoint URL:
                </label>
                <div className="flex items-center space-x-2 bg-slate-900 text-slate-100 p-2.5 rounded-lg text-xs font-mono">
                  <span className="flex-1 select-all break-all">{ep.url}</span>
                  <button
                    onClick={() => copyToClipboard(ep.url, idx * 2)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition flex-shrink-0"
                    title="Copy URL"
                  >
                    {copiedIndex === idx * 2 ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Section 3 prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Section 3 Instruction (Send fields from API response to agent):
                  </label>
                  <button
                    onClick={() => copyToClipboard(ep.section3, idx * 2 + 1)}
                    className="text-[11px] text-teal-600 hover:text-teal-800 font-medium flex items-center space-x-1"
                  >
                    {copiedIndex === idx * 2 + 1 ? <span>Copied!</span> : <span>Copy prompt</span>}
                  </button>
                </div>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono whitespace-pre-wrap">
                  {ep.section3}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
