// JSON-serialized shapes returned by the API (Dates become ISO strings)

export type MemberDto = {
  id: string;
  householdId: string;
  name: string;
  emoji: string;
  color: string;
  isAdmin: boolean;
  createdAt: string;
};

export type SessionDto = {
  id: string;
  householdId: string;
  memberId: string;
  note: string | null;
  startedAt: string;
  expectedEndAt: string;
  endedAt: string | null;
  autoExpired: boolean;
};

export type ReservationDto = {
  id: string;
  householdId: string;
  memberId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  recurrenceDays: number | null;
  seriesId: string | null;
  reminderSentAt: string | null;
  createdAt: string;
};

export type ChallengeDto = {
  id: string;
  reservationId: string;
  challengerMemberId: string;
  reason: string;
  status: "pending" | "accepted" | "declined" | "queued";
  queuePosition: number;
  createdAt: string;
  resolvedAt: string | null;
};

export type NotificationDto = {
  id: string;
  memberId: string;
  type: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type MemberStat = {
  memberId: string;
  name: string;
  emoji: string;
  color: string;
  sessions: number;
  avgMinutes: number;
  totalMinutes: number;
};

export type AnalyticsPayload = {
  timezone: string;
  perMember: MemberStat[];
  byHour: { hour: number; memberId: string; sessions: number }[];
  byWeekday: { weekday: number; memberId: string; sessions: number }[];
  byDay: { day: string; memberId: string; sessions: number; minutes: number }[];
};

export type StatusPayload = {
  now: string;
  meId: string;
  occupancy: { session: SessionDto; member: MemberDto } | null;
  members: MemberDto[];
  reservations: { reservation: ReservationDto; member: MemberDto }[];
  unreadCount: number;
};
