import React, { useState } from 'react';
import { Slack, X, CheckCircle2, AlertCircle, Send, Link, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

interface SlackConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackConnectModal: React.FC<SlackConnectModalProps> = ({ isOpen, onClose }) => {
  const { user, slackStatus, refreshSlackStatus } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('#rate-limit-alerts');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleOAuthConnect = async () => {
    if (!user) return;
    try {
      const url = await api.getSlackAuthUrl(user.id);
      window.location.href = url;
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to start Slack OAuth flow: ' + err.message });
    }
  };

  const handleWebhookConnect = async () => {
    if (!user || !webhookUrl.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.connectSlackWebhook(user.id, webhookUrl.trim(), channelName.trim());
      await refreshSlackStatus();
      setMessage({ type: 'success', text: 'Slack incoming webhook connected successfully!' });
      setWebhookUrl('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await api.disconnectSlack(user.id);
      await refreshSlackStatus();
      setMessage({ type: 'success', text: 'Slack disconnected.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to disconnect: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.testSlackAlert(user.id, 'oliver.brown@domain.io', 5);
      setMessage({ type: 'success', text: res.message });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Slack className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-gray-900">Slack Rate-Limit Notifications</h3>
              <p className="text-xs text-gray-500">Get notified the instant a sender hits their hourly limit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {message && (
          <div
            className={`my-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Current Connection Status */}
        <div className="my-5 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                slackStatus?.connected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  slackStatus?.connected ? 'bg-emerald-600' : 'bg-gray-500'
                }`}
              />
              {slackStatus?.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {slackStatus?.connected && (
            <div className="mt-3 pt-3 border-t border-gray-200/60 text-xs text-gray-600 space-y-1">
              <div>
                <strong>Channel:</strong> {slackStatus.channel || 'Default'}
              </div>
              {slackStatus.teamName && (
                <div>
                  <strong>Workspace:</strong> {slackStatus.teamName}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Connection Methods */}
        {!slackStatus?.connected ? (
          <div className="space-y-4">
            {/* Real OAuth Button */}
            <button
              onClick={handleOAuthConnect}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Slack className="w-4 h-4" />
              <span>Connect with Slack OAuth</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-400 my-2">
              <span className="flex-1 border-t border-gray-200"></span>
              <span>or connect via incoming webhook</span>
              <span className="flex-1 border-t border-gray-200"></span>
            </div>

            <div className="space-y-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-purple-500 bg-gray-50 focus:bg-white transition-all font-mono"
              />
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="#channel-name"
                className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:border-purple-500 bg-gray-50 focus:bg-white transition-all"
              />
              <button
                onClick={handleWebhookConnect}
                disabled={loading || !webhookUrl.trim()}
                className="w-full py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Link className="w-3.5 h-3.5" />
                <span>Save Webhook</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Live Verification Test Button */}
            <button
              onClick={handleTestAlert}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Send Live Test Rate-Limit Alert</span>
            </button>

            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full py-2 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect Slack</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
