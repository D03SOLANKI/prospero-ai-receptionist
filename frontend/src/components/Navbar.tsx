'use client';

import React from 'react';
import { PhoneCall, PlusCircle, Sparkles, MapPin, Phone, Clock } from 'lucide-react';

interface NavbarProps {
  isConnected: boolean;
  onSimulateCall: () => void;
  onNewAppointment: () => void;
  isSimulating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConnected,
  onSimulateCall,
  onNewAppointment,
  isSimulating
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Clinic Name */}
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-teal-600 via-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 flex-shrink-0 text-xl font-bold">
            🦷
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Prospero Microscopic Dental Clinic & Implant Centre
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                Dr. Himanshu Oberoi
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full flex items-center space-x-1">
                <span>🤖 Neha AI Receptionist</span>
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="flex items-center space-x-1 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>3rd Floor Earth Essence, Hebatpur Rd, Thaltej, Ahmedabad</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>+91 72840 49597</span>
              </span>
              <span>•</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                Fee: ₹300
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicator & Quick Actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Real-time Status Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              )}
            </span>
            <span className="font-medium text-slate-700">
              {isConnected ? 'Live Sync Active' : 'Connecting Sync...'}
            </span>
          </div>

          {/* Simulate Sarvam Call Button with Neha */}
          <button
            onClick={onSimulateCall}
            disabled={isSimulating}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white shadow-sm hover:from-teal-700 hover:to-blue-700 transition disabled:opacity-50"
            title="Simulate incoming call to Neha at Prospero Dental Clinic"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>{isSimulating ? 'Connecting Neha...' : 'Simulate Neha Call'}</span>
          </button>

          {/* New Manual Appointment */}
          <button
            onClick={onNewAppointment}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Booking</span>
          </button>
        </div>
      </div>
    </header>
  );
};
