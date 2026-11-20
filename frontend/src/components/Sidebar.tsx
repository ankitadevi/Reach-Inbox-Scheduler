import React, { useState } from 'react';
import { Clock, Send, ChevronDown, Plus, LogOut, Slack, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  setActiveTab: (tab: 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  scheduledCount,
  sentCount,
  onOpenCompose,
  onOpenSlackModal,
}) => {
  const { user, logout, slackStatus } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen select-none">
      {/* Brand Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-2xl tracking-tighter text-gray-900">ONB</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
            Scheduler
          </span>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="px-4 mb-4 relative">
        <button
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={user?.name || 'User'}
              className="w-9 h-9 rounded-full object-cover border border-emerald-500/20"
            />
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || 'Oliver Brown'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.email || 'oliver.brown@domain.io'}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        </button>

        {/* Dropdown Menu */}
        {profileMenuOpen && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-500">
              Signed in as <br />
              <span className="font-semibold text-gray-800">{user?.email}</span>
            </div>

            {/* Slack Connection Option */}
            <button
              onClick={() => {
                setProfileMenuOpen(false);
                onOpenSlackModal();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Slack className="w-4 h-4 text-purple-600" />
                <span>Slack Alert</span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  slackStatus?.connected ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
                title={slackStatus?.connected ? 'Connected' : 'Not Connected'}
              />
            </button>

            {/* BullMQ Dashboard Link */}
            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-500" />
                <span>BullMQ Live Board</span>
              </div>
            </a>

            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={() => {
                setProfileMenuOpen(false);
                logout();
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Compose Button */}
      <div className="px-4 mb-4">
        <button
          onClick={onOpenCompose}
          className="w-full py-2.5 px-4 rounded-full border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-xs group"
        >
          <Plus className="w-4 h-4 text-emerald-600 transition-transform group-hover:rotate-90 duration-200" />
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation Section */}
      <div className="px-3 flex-1 overflow-y-auto">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 mt-2 mb-2">
          CORE
        </div>

        <nav className="space-y-1">
          {/* Scheduled Nav Pill */}
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock
                className={`w-4 h-4 ${
                  activeTab === 'scheduled' ? 'text-emerald-700' : 'text-gray-400'
                }`}
              />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === 'scheduled'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          {/* Sent Nav Pill */}
          <button
            onClick={() => setActiveTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send
                className={`w-4 h-4 ${
                  activeTab === 'sent' ? 'text-emerald-700' : 'text-gray-400'
                }`}
              />
              <span>Sent</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === 'sent'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-100 text-center">
        <span className="text-[11px] text-gray-400 font-medium">ReachInbox Job Scheduler v1.0</span>
      </div>
    </aside>
  );
};
