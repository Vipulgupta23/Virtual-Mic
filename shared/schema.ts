import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  hostName: text("host_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  participantCount: integer("participant_count").notNull().default(0),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  participantName: text("participant_name"),
  audioFilename: text("audio_filename").notNull(),
  duration: integer("duration").notNull(), // in seconds
  status: text("status").notNull().default("queued"), // queued, playing, played, skipped
  order: integer("order").notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  participantCount: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  order: true,
  status: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
