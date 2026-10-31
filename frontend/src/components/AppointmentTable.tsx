'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Phone,
  Calendar,
  Clock,
  Volume2,
  FileText,
  MoreVertical,
  CalendarClock,
  Ban,
  Bot,
  UserCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Appointment, Doctor, AppointmentStatus } from '../lib/types';

interface AppointmentTableProps {
  appointments: Appointment[];
  doctors: Doctor[];
  loading: boolean;
  onSelectAppointment: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  selectedDoctor: string;
  onDoctorChange: (doctorId: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateFilter: string;
  onDateFilterChange: (filter: string) => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  newlyBookedId?: string | null;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  doctors,
  loading,
  onSelectAppointment,
  onReschedule,
  onCancel,
  selectedDoctor,
  onDoctorChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  sortBy = 'newest',
  onSortChange,
  newlyBookedId
}) => {
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'BOOKED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Booked</span>;
      case 'RESCHEDULED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Rescheduled</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'PENDING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header Controls / Filters */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient name, phone, or doctor..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
            {['today', 'tomorrow', 'all'].map((filter) => (
              <button
                key={filter}
                onClick={() => onDateFilterChange(filter)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition ${
                  dateFilter === filter
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter === 'all' ? 'All Dates' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor and Status Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Doctor Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Doctor:</span>
            <select
              value={selectedDoctor}
              onChange={(e) => onDoctorChange(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Doctors ({doctors.length})</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.department})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            {['ALL', 'BOOKED', 'RESCHEDULED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => onStatusChange(st)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition ${
                  selectedStatus === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1.5 sm:ml-auto">
            <span className="text-xs font-medium text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange && onSortChange(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
            >
              <option value="newest">Latest Booked (Newest First)</option>
              <option value="slot_time">By Consultation Slot Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <th className="py-3 px-4">Patient Details</th>
              <th className="py-3 px-4">Doctor & Dept</th>
              <th className="py-3 px-4">Date & Slot</th>
              <th className="py-3 px-4">Booking Channel</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Reason for Visit</th>
              <th className="py-3 px-4 text-center">Conversation & Audio</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading real-time appointments...</span>
                  </div>
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Calendar className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-600">No appointments found matching current filters.</p>
                    <p className="text-slate-400 text-xs">Try selecting a different doctor or date filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              appointments.map((appt) => {
                const isNewlyBooked = appt.id === newlyBookedId;
                return (
                  <tr
                    key={appt.id}
                    className={`transition-all duration-500 group cursor-pointer ${
                      isNewlyBooked
                        ? 'bg-purple-100/70 border-l-4 border-l-purple-600 shadow-sm'
                        : 'hover:bg-slate-50/80'
                    }`}
                    onClick={() => onSelectAppointment(appt)}
                  >
                    {/* Patient Name & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                          {appt.patient_name}
                        </span>
                        {isNewlyBooked && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white animate-pulse">
                            ⚡ JUST BOOKED
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{appt.patient_phone}</span>
                      </div>
                    </td>

                  {/* Doctor & Department */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{appt.doctor_name || 'Unassigned'}</div>
                    <div className="text-[11px] text-slate-500">{appt.doctor_department || 'General'}</div>
                  </td>

                  {/* Date & Time Slot */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5 font-medium text-slate-900">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{appt.appointment_date}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-slate-500 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{appt.start_time} - {appt.end_time}</span>
                    </div>
                  </td>

                  {/* Booking Channel */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {appt.booked_via === 'AI_VOICE' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Bot className="w-3 h-3 text-purple-600" />
                        <span>Sarvam Voice AI</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                        <UserCheck className="w-3 h-3 text-slate-500" />
                        <span>Manual Reception</span>
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getStatusBadge(appt.status)}
                  </td>

                  {/* Reason for Visit */}
                  <td className="py-3.5 px-4 max-w-xs truncate" title={appt.reason_for_visit}>
                    <span className="text-slate-600">
                      {appt.reason_for_visit || 'Consultation'}
                    </span>
                  </td>

                  {/* Call Audio & Transcript Button */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {appt.has_transcript || appt.booked_via === 'AI_VOICE' ? (
                      <button
                        onClick={() => onSelectAppointment(appt)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs border border-indigo-200 transition"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        <span>Audio & Chat</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Walk-in</span>
                    )}
                  </td>

                  {/* Actions (Reschedule / Cancel) */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1.5">
                      {appt.status !== 'CANCELLED' && (
                        <>
                          <button
                            onClick={() => onReschedule(appt)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                            title="Reschedule Appointment"
                          >
                            <CalendarClock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onCancel(appt)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Cancel Appointment"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onSelectAppointment(appt)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition"
                        title="View Full Details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>Showing {appointments.length} appointments</span>
        <span className="text-slate-400">Real-time synchronized with Sarvam Samvaad voice receptionist</span>
      </div>
    </div>
  );
};
