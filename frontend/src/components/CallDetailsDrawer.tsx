'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Phone,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Bot,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CalendarClock,
  Ban,
  CheckCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import { Appointment } from '../lib/types';

interface CallDetailsDrawerProps {
  appointment: Appointment | null;
  onClose: () => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
}

export const CallDetailsDrawer: React.FC<CallDetailsDrawerProps> = ({
  appointment,
  onClose,
  onReschedule,
  onCancel
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!appointment) return null;

  const callLog = appointment.call_log;
  const transcript = callLog?.transcript || [];

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm transition-opacity flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                Appointment #{appointment.id.substring(0, 8)}
              </span>
              {appointment.booked_via === 'AI_VOICE' && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-700 rounded-full border border-purple-200 flex items-center space-x-1">
                  <Bot className="w-3 h-3 text-purple-600" />
                  <span>Sarvam Samvaad</span>
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{appointment.patient_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Key Appointment Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center space-x-1">
                <Stethoscope className="w-3 h-3 text-blue-500" />
                <span>Assigned Doctor</span>
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">{appointment.doctor_name || 'Dr. Not Assigned'}</p>
              <p className="text-xs text-slate-500">{appointment.doctor_department || 'General Practice'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span>Scheduled Slot</span>
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">{appointment.appointment_date}</p>
              <p className="text-xs text-blue-600 font-medium">{appointment.start_time} - {appointment.end_time}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center space-x-1">
                <Phone className="w-3 h-3 text-emerald-500" />
                <span>Patient Phone</span>
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">{appointment.patient_phone}</p>
              <a
                href={`tel:${appointment.patient_phone}`}
                className="text-[11px] text-blue-600 hover:underline"
              >
                Click to Call
              </a>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Status & Booking Time</span>
              <div className="mt-1 flex items-center space-x-2">
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                  {appointment.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Booked: {new Date(appointment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Reason for Visit */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Reason for Visit</span>
            <p className="text-sm text-slate-700 mt-1">{appointment.reason_for_visit || 'No specific reason entered.'}</p>
          </div>

          {/* Call Recording Player (Audio) */}
          <div className="p-4 bg-slate-900 rounded-xl text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/30 text-indigo-300">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Sarvam Samvaad Call Audio</h4>
                  <p className="text-[10px] text-slate-400">
                    Call ID: {appointment.sarvam_call_id || 'SARVAM-LOCAL-STREAM'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                Recorded (42s)
              </span>
            </div>

            {/* Hidden native audio element */}
            <audio
              ref={audioRef}
              src={callLog?.recording_url || "https://actions.google.com/sounds/v1/telecom/phone_dialing_us.ogg"}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleAudioEnded}
            />

            {/* Audio Controls */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTogglePlay}
                  className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition shadow-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {formatAudioTime(currentTime)} / {formatAudioTime(duration || 42)}
                </span>
              </div>
            </div>
          </div>

          {/* AI Clinical Summary & Sentiment */}
          {callLog?.ai_summary && (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-purple-800 text-xs font-bold uppercase">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Neha AI Call Summary (Sarvam Samvaad)</span>
              </div>
              <p className="text-xs text-slate-700">{callLog.ai_summary}</p>
              <div className="pt-1 flex items-center space-x-2 text-[11px] text-slate-500">
                <span>Caller Sentiment: <strong className="text-emerald-700 font-semibold">{callLog.sentiment || 'Positive'}</strong></span>
              </div>
            </div>
          )}

          {/* Turn-by-Turn Conversation Transcript */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Turn-by-Turn Conversation History</span>
              </h3>
              <span className="text-[11px] text-slate-400">{transcript.length} turns recorded</span>
            </div>

            {transcript.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                No voice transcript captured for this appointment (Manual walk-in booking).
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {transcript.map((turn, idx) => {
                  const isAgent = turn.speaker === 'agent';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 mb-0.5">
                        <span className="font-semibold text-slate-600">
                          {isAgent ? '🤖 Neha (AI Receptionist)' : `👤 ${appointment.patient_name}`}
                        </span>
                        {turn.timestamp && <span>• {turn.timestamp}</span>}
                      </div>
                      <div
                        className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-sm ${
                          isAgent
                            ? 'bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200'
                            : 'bg-blue-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {turn.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between space-x-3">
          {appointment.status !== 'CANCELLED' ? (
            <>
              <button
                onClick={() => {
                  onClose();
                  onCancel(appointment);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
              >
                <Ban className="w-4 h-4" />
                <span>Cancel Booking</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onReschedule(appointment);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
              >
                <CalendarClock className="w-4 h-4" />
                <span>Reschedule Slot</span>
              </button>
            </>
          ) : (
            <div className="text-xs text-rose-600 font-medium flex items-center space-x-1.5">
              <Ban className="w-4 h-4" />
              <span>This appointment has been cancelled.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
