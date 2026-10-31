'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  ListFilter,
  Users,
  Bot,
  Bell,
  Sparkles,
  RefreshCw,
  Clock,
  Radio
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatsOverview } from '../components/StatsOverview';
import { AppointmentTable } from '../components/AppointmentTable';
import { CalendarView } from '../components/CalendarView';
import { DoctorOverview } from '../components/DoctorOverview';
import { CallDetailsDrawer } from '../components/CallDetailsDrawer';
import { RescheduleModal } from '../components/RescheduleModal';
import { CancelModal } from '../components/CancelModal';
import { NewAppointmentModal } from '../components/NewAppointmentModal';
import { SarvamIntegrationHub } from '../components/SarvamIntegrationHub';
import { api } from '../lib/api';
import { realtimeSocket } from '../lib/socket';
import { Appointment, Doctor, DashboardStats } from '../lib/types';

type ActiveTab = 'appointments' | 'calendar' | 'doctors' | 'sarvam';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('appointments');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [newlyBookedId, setNewlyBookedId] = useState<string | null>(null);

  // Modals & Drawer
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [isNewApptOpen, setIsNewApptOpen] = useState(false);

  // Live Toast Notification
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  const showNotification = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch Stats & Doctors
  const refreshStatsAndDoctors = useCallback(async () => {
    try {
      const [sData, dData] = await Promise.all([
        api.getDashboardStats(),
        api.getDoctors()
      ]);
      setStats(sData);
      setDoctors(dData);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  }, []);

  // Fetch Appointments with current filters
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      let date_from: string | undefined = undefined;
      let date_to: string | undefined = undefined;

      if (dateFilter === 'today') {
        date_from = todayStr;
        date_to = todayStr;
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        date_from = tomorrowStr;
        date_to = tomorrowStr;
      }

      const data = await api.getAppointments({
        doctor_id: selectedDoctor || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
        date_from,
        date_to,
        sort_by: sortBy
      });
      setAppointments(data);
    } catch (e) {
      console.error('Error fetching appointments:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDoctor, selectedStatus, searchQuery, dateFilter, sortBy]);

  // Initial Load & Real-time WebSocket Setup
  useEffect(() => {
    refreshStatsAndDoctors();
    fetchAppointments();

    // Connect WebSocket
    realtimeSocket.connect();
    const unsubStatus = realtimeSocket.onStatusChange((status) => {
      setIsConnected(status);
    });

    // Listen for New Appointments (e.g. from Sarvam AI Voice)
    const unsubCreated = realtimeSocket.subscribe('appointment:created', (newAppt: Appointment) => {
      setAppointments((prev) => [newAppt, ...prev]);
      refreshStatsAndDoctors();
      showNotification(
        'New Voice Booking Received! 🤖',
        `${newAppt.patient_name} booked with ${newAppt.doctor_name || 'Doctor'} on ${newAppt.appointment_date} at ${newAppt.start_time}`
      );
    });

    // Listen for Rescheduled Appointments
    const unsubRescheduled = realtimeSocket.subscribe('appointment:rescheduled', (updated: Appointment) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
      );
      refreshStatsAndDoctors();
      showNotification(
        'Appointment Rescheduled',
        `${updated.patient_name}'s booking moved to ${updated.appointment_date} at ${updated.start_time}`
      );
    });

    // Listen for Cancelled Appointments
    const unsubCancelled = realtimeSocket.subscribe('appointment:cancelled', (data: any) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === data.id ? { ...a, status: 'CANCELLED' } : a))
      );
      refreshStatsAndDoctors();
      showNotification(
        'Appointment Cancelled',
        `Appointment #${data.id.substring(0, 8)} has been marked as Cancelled.`
      );
    });

    // Listen for Cleared Appointments
    const unsubCleared = realtimeSocket.subscribe('appointments:cleared', () => {
      setAppointments([]);
      refreshStatsAndDoctors();
      showNotification('Clean Slate', 'All appointments have been cleared.');
    });

    // Listen for Ingested Call Audio & Transcripts
    const unsubTranscript = realtimeSocket.subscribe('call:transcript_ready', (data: any) => {
      if (data.appointment_id) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === data.appointment_id
              ? {
                  ...a,
                  has_call_recording: true,
                  has_transcript: true,
                  sarvam_call_id: data.call_id
                }
              : a
          )
        );
      }
    });

    return () => {
      unsubStatus();
      unsubCreated();
      unsubRescheduled();
      unsubCancelled();
      unsubCleared();
      unsubTranscript();
    };
  }, [refreshStatsAndDoctors, fetchAppointments]);

  // Handle Voice Call Simulator Trigger
  const handleSimulateCall = async (doctorId?: string) => {
    setIsSimulating(true);
    try {
      const res = await api.simulateSarvamCall(doctorId);
      
      // Highlight the newly created appointment
      if (res.appointment?.id) {
        setNewlyBookedId(res.appointment.id);
        setTimeout(() => setNewlyBookedId(null), 10000);

        // Fetch detailed data including conversation transcript & open drawer
        try {
          const detailed = await api.getAppointmentDetail(res.appointment.id);
          setSelectedAppointment(detailed);
        } catch {
          setSelectedAppointment(res.appointment);
        }
      }

      await fetchAppointments();
      await refreshStatsAndDoctors();
    } catch (e) {
      console.error(e);
      showNotification('Simulation Failed', 'Could not execute simulated Sarvam call.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Open Full Appointment Details Drawer
  const handleOpenAppointmentDetail = async (appt: Appointment) => {
    try {
      const detailed = await api.getAppointmentDetail(appt.id);
      setSelectedAppointment(detailed);
    } catch (e) {
      setSelectedAppointment(appt);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <Navbar
        isConnected={isConnected}
        onSimulateCall={() => handleSimulateCall()}
        onNewAppointment={() => setIsNewApptOpen(true)}
        isSimulating={isSimulating}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI Summary Cards */}
        <StatsOverview stats={stats} loading={!stats} />

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center space-x-2 py-3 px-4 font-semibold text-xs border-b-2 transition ${
                activeTab === 'appointments'
                  ? 'border-blue-600 text-blue-600 bg-white/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Appointments Management</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center space-x-2 py-3 px-4 font-semibold text-xs border-b-2 transition ${
                activeTab === 'calendar'
                  ? 'border-blue-600 text-blue-600 bg-white/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Interactive Calendar</span>
            </button>

            <button
              onClick={() => setActiveTab('doctors')}
              className={`flex items-center space-x-2 py-3 px-4 font-semibold text-xs border-b-2 transition ${
                activeTab === 'doctors'
                  ? 'border-blue-600 text-blue-600 bg-white/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Doctor Schedules & Load</span>
            </button>

            <button
              onClick={() => setActiveTab('sarvam')}
              className={`flex items-center space-x-2 py-3 px-4 font-semibold text-xs border-b-2 transition ${
                activeTab === 'sarvam'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bot className="w-4 h-4 text-purple-600" />
              <span>Sarvam Voice Integration Hub</span>
            </button>
          </nav>

          <button
            onClick={() => {
              fetchAppointments();
              refreshStatsAndDoctors();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Appointments Table */}
        {activeTab === 'appointments' && (
          <AppointmentTable
            appointments={appointments}
            doctors={doctors}
            loading={loading}
            onSelectAppointment={handleOpenAppointmentDetail}
            onReschedule={(appt) => setRescheduleTarget(appt)}
            onCancel={(appt) => setCancelTarget(appt)}
            selectedDoctor={selectedDoctor}
            onDoctorChange={setSelectedDoctor}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            newlyBookedId={newlyBookedId}
          />
        )}

        {/* Tab 2: Calendar View */}
        {activeTab === 'calendar' && (
          <CalendarView
            appointments={appointments}
            doctors={doctors}
            onSelectAppointment={handleOpenAppointmentDetail}
          />
        )}

        {/* Tab 3: Doctor Overview */}
        {activeTab === 'doctors' && (
          <DoctorOverview
            doctors={doctors}
            onSelectDoctorFilter={(docId) => {
              setSelectedDoctor(docId);
              setActiveTab('appointments');
            }}
          />
        )}

        {/* Tab 4: Sarvam Samvaad Integration Hub */}
        {activeTab === 'sarvam' && (
          <SarvamIntegrationHub
            doctors={doctors}
            onSimulateCall={handleSimulateCall}
            isSimulating={isSimulating}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <CallDetailsDrawer
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onReschedule={(appt) => setRescheduleTarget(appt)}
        onCancel={(appt) => setCancelTarget(appt)}
      />

      <RescheduleModal
        appointment={rescheduleTarget}
        doctors={doctors}
        isOpen={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => {
          fetchAppointments();
          refreshStatsAndDoctors();
        }}
      />

      <CancelModal
        appointment={cancelTarget}
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onSuccess={() => {
          fetchAppointments();
          refreshStatsAndDoctors();
        }}
      />

      <NewAppointmentModal
        doctors={doctors}
        isOpen={isNewApptOpen}
        onClose={() => setIsNewApptOpen(false)}
        onSuccess={() => {
          fetchAppointments();
          refreshStatsAndDoctors();
        }}
      />

      {/* Real-time Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-start space-x-3 animate-bounce-subtle">
          <div className="p-2 bg-purple-600 rounded-lg text-white">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-100">{toastMessage.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5">{toastMessage.desc}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
