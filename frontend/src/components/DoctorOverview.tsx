'use client';

import React, { useState } from 'react';
import { Clock, Phone, CheckCircle, Calendar, Users, Activity, Sparkles, MapPin } from 'lucide-react';
import { Doctor } from '../lib/types';
import { api } from '../lib/api';

interface DoctorOverviewProps {
  doctors: Doctor[];
  onSelectDoctorFilter?: (doctorId: string) => void;
}

export const DoctorOverview: React.FC<DoctorOverviewProps> = ({
  doctors,
  onSelectDoctorFilter
}) => {
  const [selectedDoctorSlots, setSelectedDoctorSlots] = useState<{
    doctorName: string;
    slots: any[];
  } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const viewSlots = async (doc: Doctor) => {
    setLoadingSlots(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await api.getDoctorSlots(doc.id, today);
      setSelectedDoctorSlots({
        doctorName: doc.name,
        slots: data.slots
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Dr. Himanshu Oberoi · Clinical Schedules & Load</h2>
          <p className="text-xs text-slate-500">
            Prospero Microscopic Dental Clinic & Implant Centre · Thaltej, Ahmedabad · Mon-Sat (10:00-13:30 & 16:00-20:00)
          </p>
        </div>
      </div>

      {/* Grid of Doctor / Specialty Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {doctors.map((doc) => {
          const occupancy = doc.occupancy_percentage || 0;
          const booked = doc.booked_slots_today || 0;
          const total = doc.total_slots_today || 15;
          const free = total - booked;

          return (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{doc.name}</h3>
                    <p className="text-xs text-teal-600 font-medium mt-0.5">{doc.specialization}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {doc.department}
                    </span>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-base flex-shrink-0">
                    🦷
                  </div>
                </div>

                {/* Working Hours & Fee */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Shifts:</span>
                    </span>
                    <span className="font-medium text-slate-800 text-[11px]">
                      10:00-13:30 & 16:00-20:00
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1 text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Clinic:</span>
                    </span>
                    <span className="font-medium text-slate-800 text-[11px]">+91 72840 49597</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Consultation Fee:</span>
                    <span className="font-bold text-emerald-700">₹300</span>
                  </div>
                </div>

                {/* Occupancy Progress */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Daily Utilization</span>
                    <span className="font-bold text-slate-800">{occupancy}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupancy > 80
                          ? 'bg-red-500'
                          : occupancy > 50
                          ? 'bg-amber-500'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(occupancy, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>{booked} booked</span>
                    <span className="text-emerald-600 font-medium">{free} open slots</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center space-x-2">
                <button
                  onClick={() => viewSlots(doc)}
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition text-center"
                >
                  View 30m Slots
                </button>
                {onSelectDoctorFilter && (
                  <button
                    onClick={() => onSelectDoctorFilter(doc.id)}
                    className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                    title="Filter table by this track"
                  >
                    Filter
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slots Breakdown Modal */}
      {selectedDoctorSlots && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {selectedDoctorSlots.doctorName}
                </h3>
                <p className="text-xs text-teal-600 font-medium">
                  Prospero Dental Clinic · Shift Slot Matrix (30 Mins)
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctorSlots(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              ⏰ <strong>Clinic Hours:</strong> Morning Shift: 10:00 AM – 1:30 PM | Evening Shift: 4:00 PM – 8:00 PM (Closed 1:30 PM - 4:00 PM for lunch break).
            </div>

            {loadingSlots ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading daily slots...</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
                {selectedDoctorSlots.slots.map((s, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border text-center text-xs font-semibold ${
                      s.is_available
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div>{s.display_time || s.time}</div>
                    <div className="text-[10px] font-normal mt-0.5">
                      {s.is_available ? 'Available' : 'Booked'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDoctorSlots(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
