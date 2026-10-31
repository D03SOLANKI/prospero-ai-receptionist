'use client';

import React from 'react';
import { Calendar, Bot, Users, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { DashboardStats } from '../lib/types';

interface StatsOverviewProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse border border-slate-200"></div>
        ))}
      </div>
    );
  }

  const aiPercentage = stats.total_appointments > 0
    ? Math.round((stats.ai_booked_count / stats.total_appointments) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Today's Appointments */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Consultations</span>
          <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900">{stats.today_appointments}</span>
          <span className="text-xs text-slate-500 font-medium">patients today</span>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-500 space-x-2">
          <span className="text-emerald-600 font-semibold">{stats.booked_count} confirmed</span>
          <span>•</span>
          <span className="text-purple-600 font-semibold">{stats.rescheduled_count} rescheduled</span>
        </div>
      </div>

      {/* 2. Neha AI Voice Receptionist Bookings */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Neha AI Voice Bookings</span>
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
            <Bot className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900">{stats.ai_booked_count}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
            {aiPercentage}% via AI Voice
          </span>
        </div>
        <div className="mt-3 text-xs text-slate-500 flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>Booked via Sarvam Samvaad AI</span>
        </div>
      </div>

      {/* 3. Chief Doctor & Specialties */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chief Dental Specialist</span>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-lg font-bold text-slate-900">Dr. Himanshu Oberoi</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 leading-tight">
          <span>Endodontics · Implants · Pediatric · Full Mouth Rehab</span>
        </div>
      </div>

      {/* 4. Clinic Shifts & Sunday Rule */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clinic Shift Hours</span>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-800">
            Morning: 10:00 AM – 1:30 PM
          </div>
          <div className="text-xs font-bold text-slate-800">
            Evening: 4:00 PM – 8:00 PM
          </div>
        </div>
        <div className="mt-2 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
          Mon – Sat (Sunday Closed)
        </div>
      </div>
    </div>
  );
};
