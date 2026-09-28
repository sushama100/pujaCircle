import React, { useState, useEffect } from 'react';
import { priestApi } from '@/api/priest.api';
import { bookingApi } from '@/api/booking.api';
import { Booking } from '@/types/booking.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriestBookingDetailsDialog } from '@/components/priest/PriestBookingDetailsDialog';
import { BlockTimeModal } from '@/components/priest/BlockTimeModal';
import {
  getPriestExceptions,
  savePriestException,
  deletePriestException,
  formatTimeAmPm,
  PriestException,
} from '@/lib/availabilityUtils';
import { formatFullDate } from '@/lib/utils';
import {
  Clock,
  Trash2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Ban,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Info,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * PriestAvailabilityPage
 * Exception-Based 3-Month Rolling Calendar.
 * - Default: Available 07:00 AM to 09:00 PM every day for 90 days.
 * - Manage Full-Day Leaves & Partial Hour Blackouts with 1-click.
 * - Confirmed devotee bookings automatically subtracted from available windows.
 */
export const PriestAvailabilityPage: React.FC = () => {
  const priestId = priestApi.resolveCurrentPriestId();
  const todayStr = new Date().toISOString().split('T')[0];

  // Calendar State: 0 = current month, 1 = +1 month, 2 = +2 months (90 days total)
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Data State
  const [exceptions, setExceptions] = useState<PriestException[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Load bookings and client-side exceptions
  const loadScheduleData = async () => {
    try {
      setIsLoading(true);
      const [bookingData] = await Promise.all([
        bookingApi.getPriestBookings(priestId),
      ]);
      setBookings(bookingData || []);

      // Load persistent exceptions
      const storedExceptions = getPriestExceptions(priestId);
      setExceptions(storedExceptions);
    } catch {
      toast.error('Failed to load schedule and bookings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScheduleData();
  }, [priestId]);

  // Calendar Month Computation
  const viewDate = new Date();
  viewDate.setDate(1); // Set to 1st to avoid overflow issues
  viewDate.setMonth(viewDate.getMonth() + monthOffset);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const monthTitle = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Max rolling date: 90 days from today
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Toggle Full Day Leave
  const handleToggleFullDayLeave = () => {
    const existingLeave = exceptions.find(
      (e) => e.date === selectedDate && e.type === 'FULL_DAY_LEAVE'
    );

    if (existingLeave) {
      deletePriestException(priestId, existingLeave.id);
      setExceptions((prev) => prev.filter((e) => e.id !== existingLeave.id));
      toast.success(`Leave removed for ${formatFullDate(selectedDate)}. You are now available 7 AM – 9 PM.`);
    } else {
      const newLeave: PriestException = {
        id: `leave-${Date.now()}`,
        priestId,
        date: selectedDate,
        type: 'FULL_DAY_LEAVE',
        reason: 'Full Day Off / Leave',
        createdAt: new Date().toISOString(),
      };
      savePriestException(newLeave);
      setExceptions((prev) => [...prev, newLeave]);
      toast.success(`Marked ${formatFullDate(selectedDate)} as Day Off.`);
    }
  };

  // Add Partial Hour Blackout
  const handleSaveBlackout = (startTime: string, endTime: string, reason: string) => {
    const newBlackout: PriestException = {
      id: `blackout-${Date.now()}`,
      priestId,
      date: selectedDate,
      type: 'PARTIAL_BLACKOUT',
      startTime,
      endTime,
      reason,
      createdAt: new Date().toISOString(),
    };
    savePriestException(newBlackout);
    setExceptions((prev) => [...prev, newBlackout]);
    toast.success(`Blocked ${formatTimeAmPm(startTime)} – ${formatTimeAmPm(endTime)} on ${formatFullDate(selectedDate)}.`);
  };

  // Delete a specific exception
  const handleDeleteException = (exceptionId: string) => {
    deletePriestException(priestId, exceptionId);
    setExceptions((prev) => prev.filter((e) => e.id !== exceptionId));
    toast.success('Blackout removed. Time window is now available.');
  };

  // Selected date status inspection
  const selectedDateExceptions = exceptions.filter((e) => e.date === selectedDate);
  const isSelectedFullLeave = selectedDateExceptions.some((e) => e.type === 'FULL_DAY_LEAVE');
  const selectedDateBlackouts = selectedDateExceptions.filter((e) => e.type === 'PARTIAL_BLACKOUT');
  const selectedDateBookings = bookings.filter((b) => b.bookingDate === selectedDate && b.status !== 'CANCELLED');

  // Overall metrics across the 90-day window
  const totalLeavesCount = exceptions.filter((e) => e.type === 'FULL_DAY_LEAVE').length;
  const totalBlackoutsCount = exceptions.filter((e) => e.type === 'PARTIAL_BLACKOUT').length;
  const upcomingBookingsCount = bookings.filter((b) => b.bookingDate >= todayStr && b.status !== 'CANCELLED').length;

  return (
    <div className="space-y-8 w-full max-w-7xl text-stone-900 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-xl border-2 border-amber-300 bg-white shadow-xs">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-md bg-amber-400 text-stone-950 flex items-center justify-center font-serif font-black text-2xl shadow-md shrink-0 select-none">
            ॐ
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-stone-950">
              Availability & Leaves Calendar
            </h1>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              You are automatically set as <strong>Available 7:00 AM – 9:00 PM</strong> for the next 90 days. Simply mark your days off or busy hours below.
            </p>
          </div>
        </div>

        {/* 90-Day Rolling Badge */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg text-amber-900 text-xs font-bold shrink-0">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <span>90-Day Rolling Calendar</span>
        </div>
      </div>

      {/* Metrics Summary Deck */}
      <div className="flex flex-wrap gap-4 w-full">
        <div className="flex-1 min-w-50 p-5 rounded-lg border-2 border-amber-300 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Default Working Hours
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-serif text-emerald-700 mt-2">
            7 AM – 9 PM
          </div>
          <span className="text-[11px] text-stone-500 block mt-1">Automatic 14-hr daily window</span>
        </div>

        <div className="flex-1 min-w-50 p-5 rounded-lg border-2 border-amber-300 border-t-4 border-t-red-600 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">
              Marked Days Off
            </span>
            <Ban className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-3xl font-extrabold font-serif text-red-700 mt-2">
            {totalLeavesCount} {totalLeavesCount === 1 ? 'day' : 'days'}
          </div>
          <span className="text-[11px] text-stone-500 block mt-1">Full-day leaves marked</span>
        </div>

        <div className="flex-1 min-w-50 p-5 rounded-lg border-2 border-amber-300 border-t-4 border-t-amber-600 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Partial Blackouts
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold font-serif text-amber-700 mt-2">
            {totalBlackoutsCount}
          </div>
          <span className="text-[11px] text-stone-500 block mt-1">Blocked hour windows</span>
        </div>

        <div className="flex-1 min-w-50 p-5 rounded-lg border-2 border-amber-300 border-t-4 border-t-blue-600 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              Confirmed Pujas
            </span>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold font-serif text-blue-800 mt-2">
            {upcomingBookingsCount}
          </div>
          <span className="text-[11px] text-stone-500 block mt-1">Upcoming bookings</span>
        </div>
      </div>

      {/* Main Grid: Interactive Calendar on Left, Selected Day Inspector on Right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Calendar Card */}
        <div className="flex-1 w-full bg-white p-6 rounded-xl border-2 border-amber-300 shadow-xs space-y-4">
          {/* Month Switcher Header */}
          <div className="flex items-center justify-between pb-3 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-red-700" />
              <h2 className="font-serif font-extrabold text-lg text-stone-900">
                {monthTitle}
              </h2>
              {isLoading && (
                <span className="text-xs text-amber-700 animate-pulse font-medium">
                  Syncing...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={monthOffset === 0}
                onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
                className="h-8 px-2.5 border-amber-300 hover:bg-amber-50 text-stone-700"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-xs ml-1">Prev</span>
              </Button>

              <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded">
                Month {monthOffset + 1} of 3
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={monthOffset >= 2}
                onClick={() => setMonthOffset((prev) => Math.min(2, prev + 1))}
                className="h-8 px-2.5 border-amber-300 hover:bg-amber-50 text-stone-700"
              >
                <span className="hidden sm:inline text-xs mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-stone-500 uppercase tracking-wider py-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-24 bg-stone-50/40 rounded-lg border border-transparent" />
            ))}

            {/* Actual Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isPast = dateStr < todayStr;
              const isBeyond90 = dateStr > maxDateStr;
              const isDisabled = isPast || isBeyond90;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;

              // Day states
              const dayExceptions = exceptions.filter((e) => e.date === dateStr);
              const isLeave = dayExceptions.some((e) => e.type === 'FULL_DAY_LEAVE');
              const partialCount = dayExceptions.filter((e) => e.type === 'PARTIAL_BLACKOUT').length;
              const dayBookings = bookings.filter((b) => b.bookingDate === dateStr && b.status !== 'CANCELLED');

              return (
                <div
                  key={dateStr}
                  onClick={() => !isDisabled && setSelectedDate(dateStr)}
                  className={`h-24 p-2 rounded-lg border-2 transition-all flex flex-col justify-between select-none ${
                    isDisabled
                      ? 'bg-stone-50/70 border-stone-200/60 opacity-45 cursor-not-allowed'
                      : isSelected
                      ? 'border-[#780016] bg-amber-50/60 shadow-sm cursor-pointer ring-2 ring-amber-300/40'
                      : 'border-amber-200/80 hover:border-amber-400 bg-white cursor-pointer'
                  }`}
                >
                  {/* Top row: day number + badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? 'text-[#780016] font-extrabold' : 'text-stone-800'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-50 text-red-700 border-red-300 font-bold">
                        Today
                      </Badge>
                    )}
                  </div>

                  {/* Day Status Indicators */}
                  {!isDisabled && (
                    <div className="space-y-1">
                      {isLeave ? (
                        <div className="text-[10px] font-bold text-red-700 bg-red-100/90 rounded px-1 py-0.5 text-center">
                          Day Off
                        </div>
                      ) : (
                        <>
                          <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">7 AM - 9 PM</span>
                          </div>

                          {partialCount > 0 && (
                            <div className="text-[9px] font-bold text-amber-800 bg-amber-100 rounded px-1 py-0.2 truncate">
                              ⚠️ {partialCount} blocked
                            </div>
                          )}

                          {dayBookings.length > 0 && (
                            <div className="text-[9px] font-bold text-blue-800 bg-blue-100 rounded px-1 py-0.2 truncate">
                              🪔 {dayBookings.length} {dayBookings.length === 1 ? 'Puja' : 'Pujas'}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center gap-4 text-xs text-stone-600">
            <span className="font-bold text-stone-800">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Available (7 AM - 9 PM)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span>Day Off (Full Leave)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Blocked Hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span>Confirmed Booking</span>
            </div>
          </div>
        </div>

        {/* Selected Day Inspector & Actions Panel */}
        <div className="w-full lg:w-96 bg-white p-6 rounded-xl border-2 border-amber-300 shadow-xs space-y-6">
          {/* Selected Date Header */}
          <div className="pb-3 border-b border-amber-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Selected Auspicious Date
            </span>
            <h2 className="text-xl font-serif font-black text-stone-900 mt-1">
              {formatFullDate(selectedDate)}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {isSelectedFullLeave ? (
                <Badge className="bg-red-100 text-red-800 border-red-300 text-xs font-bold">
                  Status: Full Day Off
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
                  Status: Open For Bookings
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleToggleFullDayLeave}
              className={`w-full justify-center gap-2 h-11 text-xs font-bold shadow-xs cursor-pointer ${
                isSelectedFullLeave
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-red-800 hover:bg-red-900 text-white'
              }`}
            >
              {isSelectedFullLeave ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Cancel Leave (Make Available)
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" /> Mark Full Day Off (Leave)
                </>
              )}
            </Button>

            {!isSelectedFullLeave && (
              <Button
                variant="outline"
                onClick={() => setIsBlockModalOpen(true)}
                className="w-full justify-center gap-2 h-11 border-2 border-amber-400 text-stone-900 hover:bg-amber-50 font-bold text-xs cursor-pointer"
              >
                <Clock className="h-4 w-4 text-amber-700" />
                <span>Block Specific Hours (e.g. 1 PM - 4 PM)</span>
              </Button>
            )}
          </div>

          {/* Day Schedule Breakdown */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-amber-700" />
              <span>Schedule Breakdown</span>
            </h3>

            {isSelectedFullLeave ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>Marked as Day Off</span>
                </div>
                <p className="text-[11px] text-red-700">
                  Devotees cannot book any ceremonies on this date. Click above to cancel leave.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Default 7 AM to 9 PM working window */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-950 block">Standard Hours</span>
                    <span className="text-[11px] text-emerald-700">07:00 AM – 09:00 PM (14 hrs)</span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Active
                  </Badge>
                </div>

                {/* Partial Blackouts List */}
                {selectedDateBlackouts.map((bo) => (
                  <div
                    key={bo.id}
                    className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-700" />
                        <span>Blocked: {formatTimeAmPm(bo.startTime || '')} – {formatTimeAmPm(bo.endTime || '')}</span>
                      </div>
                      <div className="text-[11px] text-amber-800 mt-0.5">{bo.reason || 'Unavailable'}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteException(bo.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 hover:text-red-800"
                      title="Remove blackout"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* Confirmed Bookings List */}
                {selectedDateBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-blue-50 border border-blue-300 rounded-lg text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-blue-950">
                        🪔 {b.serviceName || 'Puja Ceremony'}
                      </div>
                      <div className="text-[11px] text-blue-700 mt-0.5">
                        {formatTimeAmPm(b.startTime || '')} – {formatTimeAmPm(b.endTime || '')} (Confirmed)
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBooking(b);
                        setIsBookingModalOpen(true);
                      }}
                      className="h-7 px-2.5 text-[11px] border-blue-300 text-blue-900 hover:bg-blue-100 font-bold"
                    >
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Partial Hour Blackout Modal */}
      <BlockTimeModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        selectedDate={selectedDate}
        onSave={handleSaveBlackout}
      />

      {/* Booking Details Modal */}
      <PriestBookingDetailsDialog
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
      />
    </div>
  );
};

export default PriestAvailabilityPage;
