import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Paperclip,
  Upload,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Strikethrough,
  X,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { SendLaterPopover } from './SendLaterPopover.js';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailScheduled: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onEmailScheduled,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [senders, setSenders] = useState<string[]>(['oliver.brown@domain.io']);
  const [selectedSender, setSelectedSender] = useState<string>('oliver.brown@domain.io');
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [recipientsList, setRecipientsList] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [showSendLater, setShowSendLater] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchSenders = async () => {
      try {
        const list = await api.getSenders();
        if (list && list.length > 0) {
          setSenders(list);
          setSelectedSender(list[0]);
        }
      } catch (err) {
        console.error('Failed to fetch senders:', err);
      }
    };
    if (isOpen) {
      fetchSenders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && recipientInput.trim()) {
      e.preventDefault();
      const val = recipientInput.replace(',', '').trim();
      if (val && !recipientsList.includes(val)) {
        setRecipientsList([...recipientsList, val]);
      }
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (indexToRemove: number) => {
    setRecipientsList(recipientsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadStatus('Parsing leads file...');
      const res = await api.uploadLeads(file);
      if (res.success && res.emails.length > 0) {
        const combined = Array.from(new Set([...recipientsList, ...res.emails]));
        setRecipientsList(combined);
        setUploadStatus(`Detected ${res.totalFound} leads from ${res.filename}`);
      } else {
        setUploadStatus('No valid emails found in file');
      }
    } catch (err: any) {
      setUploadStatus('Failed to upload/parse lead file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!user) return;

    const allRecipients = [...recipientsList];
    if (recipientInput.trim() && !allRecipients.includes(recipientInput.trim())) {
      allRecipients.push(recipientInput.trim());
    }

    if (allRecipients.length === 0) {
      alert('Please enter at least one recipient email address or upload a leads file.');
      return;
    }

    if (!subject.trim()) {
      alert('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      alert('Please write email content.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.scheduleEmail({
        userId: user.id,
        senderEmail: selectedSender,
        recipientEmails: allRecipients,
        subject,
        body,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
        delayBetweenEmails,
        hourlyLimit,
      });

      onEmailScheduled();
      onClose();
    } catch (err: any) {
      alert(`Scheduling error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Bar matching Figma */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-lg text-gray-900">Compose New Email</h2>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3 relative">
            <button
              title="Attach File"
              className="p-2 rounded-full hover:bg-emerald-50 text-emerald-600 transition-colors relative"
            >
              <Paperclip className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                1
              </span>
            </button>

            {/* Clock icon to trigger Send Later popover */}
            <button
              onClick={() => setShowSendLater(!showSendLater)}
              title="Schedule Send Later"
              className={`p-2 rounded-full hover:bg-emerald-50 transition-colors ${
                scheduledAt ? 'bg-emerald-100 text-emerald-800' : 'text-emerald-600'
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Send Later Popover Anchor */}
            {showSendLater && (
              <SendLaterPopover
                initialDate={scheduledAt}
                onSelectTime={(date) => {
                  setScheduledAt(date);
                  setShowSendLater(false);
                }}
                onClose={() => setShowSendLater(false)}
              />
            )}

            {/* Primary Action Button */}
            <button
              onClick={handleScheduleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 font-medium text-sm transition-all shadow-xs flex items-center gap-2"
            >
              <span>{isSubmitting ? 'Scheduling...' : scheduledAt ? 'Send Later' : 'Send'}</span>
              {scheduledAt && (
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  {format(scheduledAt, 'MMM d, h:mm a')}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* From Field */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <span className="text-sm text-gray-500 w-16 shrink-0 font-medium">From</span>
            <div className="relative">
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="appearance-none bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer transition-colors"
              >
                {senders.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* To Field with Bulk Chips & Upload List Button */}
          <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
            <span className="text-sm text-gray-500 w-16 pt-1.5 shrink-0 font-medium">To</span>
            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[36px]">
              {recipientsList.map((email, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded-full font-medium"
                >
                  <span>{email}</span>
                  <button
                    onClick={() => handleRemoveRecipient(idx)}
                    className="hover:text-red-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddRecipient}
                placeholder={recipientsList.length === 0 ? 'recipient@example.com (Press Enter to add)' : 'Add another recipient...'}
                className="flex-1 min-w-[200px] text-sm text-gray-800 outline-none bg-transparent placeholder-gray-400 py-1"
              />
            </div>

            {/* Upload List Action matching Figma */}
            <div className="shrink-0 pt-0.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Upload List</span>
              </button>
            </div>
          </div>

          {uploadStatus && (
            <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              {uploadStatus}
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <span className="text-sm text-gray-500 w-16 shrink-0 font-medium">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full text-sm font-semibold text-gray-900 outline-none placeholder-gray-400"
            />
          </div>

          {/* Rate Limiting & Inter-Email Delay Controls matching Figma */}
          <div className="flex flex-wrap items-center gap-8 py-2 bg-gray-50/70 px-4 rounded-xl border border-gray-100">
            {/* Delay between 2 emails */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 font-medium">Delay between 2 emails (sec):</span>
              <input
                type="number"
                min="0"
                max="3600"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                className="w-14 h-8 border border-gray-300 rounded-lg text-center text-sm font-mono font-semibold text-gray-800 bg-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Hourly Limit */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 font-medium">Hourly Limit:</span>
              <input
                type="number"
                min="1"
                max="10000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
                className="w-16 h-8 border border-gray-300 rounded-lg text-center text-sm font-mono font-semibold text-gray-800 bg-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="text-[11px] text-gray-400">
              Redis-backed sliding window protection with live Slack alerts
            </div>
          </div>

          {/* Rich Text Editor Box with Floating Formatting Toolbar matching Figma */}
          <div className="bg-[#F9FAFB] rounded-2xl p-5 min-h-[300px] border border-gray-100 relative">
            {/* Formatting Toolbar Pill */}
            <div className="bg-white shadow-xs border border-gray-200 px-3 py-1.5 rounded-full flex items-center gap-2.5 w-fit mb-3 select-none">
              <button
                type="button"
                title="Undo"
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Redo"
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-3.5 bg-gray-200" />
              <button
                type="button"
                title="Bold"
                className="p-1 hover:bg-gray-100 rounded text-gray-700 font-bold transition-colors"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Italic"
                className="p-1 hover:bg-gray-100 rounded text-gray-700 italic transition-colors"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Underline"
                className="p-1 hover:bg-gray-100 rounded text-gray-700 underline transition-colors"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Strikethrough"
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-3.5 bg-gray-200" />
              <button
                type="button"
                title="Bullet List"
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Numbered List"
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Quote"
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Code"
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Email Body Textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type Your Reply..."
              rows={8}
              className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
