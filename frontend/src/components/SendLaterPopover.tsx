import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { format, addHours, addDays, setHours, setMinutes, setSeconds } from 'date-fns';

interface SendLaterPopoverProps {
  initialDate?: Date;
  onSelectTime: (date: Date) => void;
  onClose: () => void;
}

export const SendLaterPopover: React.FC<SendLaterPopoverProps> = ({
  initialDate,
  onSelectTime,
  onClose,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = initialDate || addHours(new Date(), 1);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  });

  const now = new Date();
  const tomorrow = addDays(now, 1);

  const presets = [
    {
      label: '⚡ In 10 Seconds (Live Demo)',
      date: new Date(Date.now() + 10 * 1000),
    },
    {
      label: '⚡ In 30 Seconds (Live Demo)',
      date: new Date(Date.now() + 30 * 1000),
    },
    {
      label: 'Tomorrow, 10:00 AM',
      date: setSeconds(setMinutes(setHours(tomorrow, 10), 0), 0),
    },
    {
      label: 'Tomorrow, 11:00 AM',
      date: setSeconds(setMinutes(setHours(tomorrow, 11), 0), 0),
    },
    {
      label: 'Tomorrow, 3:00 PM',
      date: setSeconds(setMinutes(setHours(tomorrow, 15), 0), 0),
    },
  ];

  const handleApplyPreset = (presetDate: Date) => {
    setSelectedDate(format(presetDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleDone = () => {
    const dateObj = new Date(selectedDate);
    if (!isNaN(dateObj.getTime())) {
      onSelectTime(dateObj);
    }
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Send Later</span>
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Date & Time Picker */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-500 mb-1.5 block">
          Pick date & time
        </label>
        <div className="relative">
          <input
            type="datetime-local"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
          />
        </div>
      </div>

      {/* Quick Presets matching Figma */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Quick Presets
        </div>
        <div className="space-y-1">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset.date)}
              className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center justify-between group"
            >
              <span>{preset.label}</span>
              <span className="text-[10px] text-gray-400 group-hover:text-emerald-600 font-mono">
                {format(preset.date, 'MMM d, h:mm a')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDone}
          className="px-4 py-1.5 text-xs font-semibold rounded-full border border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
