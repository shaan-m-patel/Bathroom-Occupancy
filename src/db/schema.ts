import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const challengeStatusEnum = pgEnum("challenge_status", [
  "pending",
  "accepted",
  "declined",
  "queued",
]);

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🙂"),
  color: text("color").notNull().default("#3b82f6"),
  isAdmin: boolean("is_admin").notNull().default(false),
  // Push preferences keyed by category; a missing key means enabled
  notificationPrefs: jsonb("notification_prefs")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  // Minutes since midnight in the household timezone; both null = disabled
  quietHoursStart: integer("quiet_hours_start"),
  quietHoursEnd: integer("quiet_hours_end"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// endedAt null = session still active; occupancy also requires expectedEndAt > now
export const occupancySessions = pgTable("occupancy_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  note: text("note"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expectedEndAt: timestamp("expected_end_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  autoExpired: boolean("auto_expired").notNull().default(false),
});

// Recurring reservations: the first occurrence stores recurrenceDays (bitmask,
// bit 0 = Sunday). Future occurrences are materialized rows sharing seriesId.
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
  recurrenceDays: integer("recurrence_days"),
  seriesId: uuid("series_id"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  challengerMemberId: uuid("challenger_member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: challengeStatusEnum("status").notNull().default("pending"),
  queuePosition: integer("queue_position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// "Notify me when free": rows are pinged and cleared when the bathroom opens up
export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .unique()
    .references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  body: text("body").notNull(),
  // Optional link target within the app, e.g. /schedule
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Household = typeof households.$inferSelect;
export type Member = typeof members.$inferSelect;
export type OccupancySession = typeof occupancySessions.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
