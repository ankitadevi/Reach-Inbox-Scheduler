import React from 'react';
import { ArrowLeft, Star, Trash2, Archive, ExternalLink, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { Email } from '../types/email.js';

interface EmailDetailProps {
  email: Email;
  onBack: () => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, onBack, onToggleStar }) => {
  const formattedDate = () => {
    try {
      const date = email.sentAt ? new Date(email.sentAt) : new Date(email.scheduledAt);
      return format(date, 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  const senderInitial = (email.senderEmail[0] || 'S').toUpperCase();

  return (
    <div className="bg-white min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Header Bar matching Figma */}
      <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            title="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-lg text-gray-900 truncate max-w-2xl">
            {email.subject}
          </h2>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2">
          {email.etherealPreviewUrl && (
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors mr-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ethereal SMTP View</span>
            </a>
          )}

          <button
            onClick={(e) => onToggleStar(email.id, e)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-amber-500 transition-colors"
          >
            <Star
              className={`w-4 h-4 ${
                email.starred ? 'text-amber-400 fill-amber-400' : ''
              }`}
            />
          </button>

          <button
            title="Archive"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            title="Delete"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 max-w-4xl">
        {/* Sender Info Row */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center text-base shadow-xs">
              {senderInitial}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {email.senderEmail}
              </div>
              <div className="text-xs text-gray-500">
                to <span className="font-medium text-gray-700">{email.recipientEmail}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-400">{formattedDate()}</span>
            <div className="mt-1">
              {email.status === 'SENT' ? (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Delivered
                </span>
              ) : email.status === 'PROCESSING' ? (
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Processing
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Scheduled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Email Body Content */}
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-4">
          <div
            dangerouslySetInnerHTML={{ __html: email.body }}
            className="text-sm text-gray-800 font-normal leading-relaxed"
          />

          {/* Highlighted Yellow/Amber Callout Box from Figma */}
          <div className="bg-amber-50/80 border border-amber-300/80 rounded-xl p-5 my-6 shadow-2xs">
            <p className="font-bold text-amber-950 text-sm flex items-center gap-2">
              <span>⚡</span> Extremely Exclusive — Only 4 Spots Worldwide Per Year | $25,000 investment
            </p>
            <p className="text-sm text-amber-900 mt-2">
              ⚡ To explore securing your private transformation, simply reply right now with <strong className="underline">"FLY OUT FIX"</strong>.
            </p>
          </div>

          <div className="pt-4 text-sm text-gray-600">
            <p>Your coach for world-class performance,</p>
            <p className="font-semibold text-gray-800 mt-1">Grant</p>
            <p className="text-xs text-gray-500 mt-2 italic">
              P.S. Always remember that you can develop world class technique! 🚀
            </p>
          </div>
        </div>

        {/* Attachment Cards from Figma */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attachments (2 files)</span>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="w-56 border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-500 transition-colors shadow-2xs group cursor-pointer">
              <div className="h-28 bg-gradient-to-tr from-emerald-100 to-teal-50 flex items-center justify-center">
                <span className="text-xs font-semibold text-emerald-800 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-md">
                  IMG Preview
                </span>
              </div>
              <div className="p-3 bg-white">
                <div className="text-xs font-semibold text-gray-800 truncate">Tennis_Coach_Profile.png</div>
                <div className="text-[11px] text-gray-400 mt-0.5">1.2 MB</div>
              </div>
            </div>

            <div className="w-56 border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-500 transition-colors shadow-2xs group cursor-pointer">
              <div className="h-28 bg-gradient-to-tr from-amber-100 to-orange-50 flex items-center justify-center">
                <span className="text-xs font-semibold text-amber-800 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-md">
                  IMG Preview 2
                </span>
              </div>
              <div className="p-3 bg-white">
                <div className="text-xs font-semibold text-gray-800 truncate">Tennis_Coach_Profile2.png</div>
                <div className="text-[11px] text-gray-400 mt-0.5">1.2 MB</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
