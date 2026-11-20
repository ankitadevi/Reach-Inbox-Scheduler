import React from 'react';
import { Send, Star, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Email } from '../types/email.js';

interface SentListProps {
  emails: Email[];
  loading: boolean;
  onSelectEmail: (email: Email) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onOpenCompose: () => void;
}

export const SentList: React.FC<SentListProps> = ({
  emails,
  loading,
  onSelectEmail,
  onToggleStar,
  onOpenCompose,
}) => {
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-white rounded-xl border border-gray-100 p-4 animate-pulse flex items-center justify-between">
            <div className="w-36 h-4 bg-gray-200 rounded"></div>
            <div className="w-16 h-5 bg-gray-100 rounded-full"></div>
            <div className="w-96 h-4 bg-gray-200 rounded"></div>
            <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">No sent emails yet</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
          Sent emails processed by the BullMQ worker via Ethereal SMTP will show up here along with live inspection links.
        </p>
        <button
          onClick={onOpenCompose}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-xs"
        >
          Compose New Email
        </button>
      </div>
    );
  }

  const formatSentTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="divide-y divide-gray-100 bg-white">
      {emails.map((email) => {
        const bodySnippet = email.body.replace(/<[^>]*>?/gm, '');

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 cursor-pointer transition-colors group"
          >
            {/* Recipient */}
            <div className="w-48 shrink-0">
              <span className="font-semibold text-sm text-gray-900 truncate block">
                To: {email.recipientEmail}
              </span>
            </div>

            {/* Sent Status Badge matching Figma */}
            <div className="shrink-0 mx-4 flex items-center gap-2">
              {email.status === 'SENT' ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  Sent
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  Failed
                </span>
              )}

              {email.sentAt && (
                <span className="text-xs text-gray-400">
                  {formatSentTime(email.sentAt)}
                </span>
              )}
            </div>

            {/* Subject & Preview Snippet */}
            <div className="flex-1 min-w-0 mx-4">
              <p className="text-sm truncate">
                <span className="font-semibold text-gray-900">{email.subject}</span>
                <span className="text-gray-500 ml-2 font-normal">- {bodySnippet}</span>
              </p>
            </div>

            {/* Actions: Ethereal Live Preview Link & Star */}
            <div className="shrink-0 ml-4 flex items-center gap-3">
              {email.etherealPreviewUrl && (
                <a
                  href={email.etherealPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="View delivered email on Ethereal"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full border border-emerald-200 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ethereal View</span>
                </a>
              )}

              <button
                onClick={(e) => onToggleStar(email.id, e)}
                title={email.starred ? 'Starred' : 'Not starred'}
                className="p-1 text-gray-300 hover:text-amber-400 transition-colors"
              >
                <Star
                  className={`w-4 h-4 ${
                    email.starred ? 'text-amber-400 fill-amber-400' : 'group-hover:text-gray-400'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
