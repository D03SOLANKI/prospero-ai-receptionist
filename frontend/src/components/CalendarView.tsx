'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Bot,
  Filter
} from 'lucide-react';
import { Appointment, Doctor, CalendarEvent } from '../lib/types';

interface CalendarViewProps {
  appointments: Appointment[];
  doctors: Doctor[];
  onSelectAppointment: (appointment: Appointment) => void;
}

type ViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  doctors,
  onSelectAppointment
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-10-30T00:00:00'));
  const [todayStr, setTodayStr] = useState<string>('2026-10-30');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  React.useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setTodayStr(formatDateStr(now));
  }, []);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigate calendar
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter((a) => {
    if (selectedDoctorId && a.doctor_id !== selectedDoctorId) return false;
    return true;
  });

  // Generate days for Month View
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    monthCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    monthCells.push(new Date(year, month, d));
  }

  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Calendar Top Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-slate-500">Visual Appointment Schedule</p>
          </div>
        </div>

        {/* View Mode & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Doctor Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Doctors ({doctors.length})</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md capitalize transition ${
                  viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleToday}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition"
            >
              Today
            </button>
            <button
              onClick={handlePrev}
              className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="p-4">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-500 mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 auto-rows-fr">
            {monthCells.map((dateObj, idx) => {
              if (!dateObj) {
                return <div key={idx} className="h-28 bg-slate-50/50 rounded-lg border border-transparent"></div>;
              }

              const dateStr = formatDateStr(dateObj);
              const dayAppts = filteredAppointments.filter((a) => a.appointment_date === dateStr);
              const isToday = todayStr === dateStr;

              return (
                <div
                  key={idx}
                  className={`min-h-[115px] p-2 rounded-xl border transition flex flex-col ${
                    isToday
                      ? 'border-blue-400 bg-blue-50/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                      }`}
                    >
                      {dateObj.getDate()}
                    </span>
                    {dayAppts.length > 0 && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
                        {dayAppts.length}
                      </span>
                    )}
                  </div>

                  {/* Appointments in this day */}
                  <div className="space-y-1 overflow-y-auto max-h-20 flex-1">
                    {dayAppts.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        onClick={() => onSelectAppointment(a)}
                        className={`p-1.5 rounded-md text-[10px] font-medium cursor-pointer truncate transition border shadow-xs ${
                          a.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : a.status === 'RESCHEDULED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                        title={`${a.start_time} - ${a.patient_name} with ${a.doctor_name}`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{a.start_time}</span>
                          {a.booked_via === 'AI_VOICE' && <Bot className="w-2.5 h-2.5 text-purple-600" />}
                        </div>
                        <div className="truncate">{a.patient_name}</div>
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-medium text-center">
                        +{dayAppts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW & DAY VIEW */}
      {viewMode !== 'month' && (
        <div className="p-6 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              Appointments for {formatDateStr(currentDate)}
            </h3>
            {filteredAppointments.filter((a) => a.appointment_date === formatDateStr(currentDate)).length === 0 ? (
              <div className="p-8 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs">
                No appointments scheduled for this date.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAppointments
                  .filter((a) => a.appointment_date === formatDateStr(currentDate))
                  .map((a) => (
                    <div
                      key={a.id}
                      onClick={() => onSelectAppointment(a)}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 shadow-sm flex items-center justify-between cursor-pointer transition text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs">
                          {a.start_time}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{a.patient_name}</p>
                          <p className="text-[11px] text-slate-500">
                            Dr. {a.doctor_name} • {a.reason_for_visit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {a.status}
                        </span>
                        {a.booked_via === 'AI_VOICE' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            Sarvam Voice
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
