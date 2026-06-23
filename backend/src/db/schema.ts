import { relations } from "drizzle-orm";
import { date, integer, pgEnum, pgTable, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const authProvidersEnum = pgEnum("auth_providers", ["Github", "Google"]);
export const messageRole = pgEnum("message_role", ["user", "assistant"])


export const user = pgTable('users', {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  authProviders: authProvidersEnum("auth_provider").notNull(),
  name: text("name"),
  supabaseID: text("supabase_id").notNull(),
});

export const conversation = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title"),
  slug: text("slug"),
  userId: uuid("user_id").references(() => user.id),
});

export const message = pgTable("message", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  role: messageRole("role"),
  conversationID: integer("conversation_id").references(() => conversation.id),
  createdAt: timestamp("created_at").defaultNow(),
})

export const userRalations = relations(user, ({ many }) => ({
  conversations: many(conversation)
}))

export const conversationRelations = relations(conversation, ({one, many}) => ({
  messages: many(message),
  user: one(user, {
    fields: [conversation.userId],
    references: [user.id],
  })
}))

export const messageRelations = relations(message, ({one}) => ({
  conversation: one(conversation,{
    fields: [message.conversationID],
    references: [conversation.id]
  })
}))