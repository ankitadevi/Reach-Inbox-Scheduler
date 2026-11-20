export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  slackConnected?: boolean;
}

export interface SlackStatus {
  connected: boolean;
  channel: string | null;
  teamName: string | null;
  connectedAt: string | null;
}
