import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { ScheduledList } from './components/ScheduledList.js';
import { SentList } from './components/SentList.js';
import { EmailDetail } from './components/EmailDetail.js';
import { ComposeModal } from './components/ComposeModal.js';
import { SlackConnectModal } from './components/SlackConnectModal.js';
import { LoginView } from './components/LoginView.js';
import { useAuth } from './context/AuthContext.js';
import { api } from './services/api.js';
import { Email } from './types/email.js';

export const App: React.FC = () => {
  const { user, loading: authLoading, refreshSlackStatus } = useAuth();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState<number>(0);
  const [sentTotal, setSentTotal] = useState<number>(0);

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingEmails, setLoadingEmails] = useState<boolean>(true);

  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState<boolean>(false);

  // Check URL parameters (e.g. from Slack OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack_connected') === 'true') {
      refreshSlackStatus();
      setIsSlackModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshSlackStatus]);

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const [scheduledRes, sentRes] = await Promise.all([
        api.getScheduledEmails(user.id, searchQuery),
        api.getSentEmails(user.id, searchQuery),
      ]);

      setScheduledEmails(scheduledRes.emails || []);
      setScheduledTotal(scheduledRes.total || 0);

      setSentEmails(sentRes.emails || []);
      setSentTotal(sentRes.total || 0);

      // If viewing an email, update its state
      if (selectedEmail) {
        const found =
          scheduledRes.emails?.find((e) => e.id === selectedEmail.id) ||
          sentRes.emails?.find((e) => e.id === selectedEmail.id);
        if (found) {
          setSelectedEmail(found);
        }
      }
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setIsRefreshing(false);
      setLoadingEmails(false);
    }
  }, [user, searchQuery, selectedEmail]);

  useEffect(() => {
    fetchEmails();
    // Auto-poll every 5 seconds to update queue/sent statuses in real-time
    const interval = setInterval(fetchEmails, 5000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const handleToggleStar = async (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.toggleStar(emailId);
      if (res.success) {
        setScheduledEmails((prev) =>
          prev.map((item) => (item.id === emailId ? { ...item, starred: res.starred } : item))
        );
        setSentEmails((prev) =>
          prev.map((item) => (item.id === emailId ? { ...item, starred: res.starred } : item))
        );
        if (selectedEmail && selectedEmail.id === emailId) {
          setSelectedEmail((prev) => (prev ? { ...prev, starred: res.starred } : null));
        }
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const currentListCount = activeTab === 'scheduled' ? scheduledTotal : sentTotal;

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedEmail(null);
        }}
        scheduledCount={scheduledTotal}
        sentCount={sentTotal}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={fetchEmails}
          isRefreshing={isRefreshing}
          totalResults={currentListCount}
        />

        {/* View Switcher: Email Detail vs Email Table */}
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onToggleStar={handleToggleStar}
            />
          ) : activeTab === 'scheduled' ? (
            <ScheduledList
              emails={scheduledEmails}
              loading={loadingEmails}
              onSelectEmail={(email) => setSelectedEmail(email)}
              onToggleStar={handleToggleStar}
              onOpenCompose={() => setIsComposeOpen(true)}
            />
          ) : (
            <SentList
              emails={sentEmails}
              loading={loadingEmails}
              onSelectEmail={(email) => setSelectedEmail(email)}
              onToggleStar={handleToggleStar}
              onOpenCompose={() => setIsComposeOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onEmailScheduled={fetchEmails}
      />

      {/* Slack Connection & Rate-Limit Alert Modal */}
      <SlackConnectModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
      />
    </div>
  );
};

export default App;
