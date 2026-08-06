import { asc, eq } from 'drizzle-orm';

import { db } from '../client';
import { chatMessages } from '../schema';
import { generateId } from '@/utils/uuid';
import type { ChatMessage, ChatRole, SuggestedActionStatus } from '@/types';

function toChatMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    userId: row.userId,
    role: row.role as ChatRole,
    content: row.content,
    actionStatus: row.actionStatus as SuggestedActionStatus | null,
    createdAt: row.createdAt,
  };
}

/** Oldest first, matching chat-thread display order. */
export async function listChatMessages(userId: string): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(asc(chatMessages.createdAt));
  return rows.map(toChatMessage);
}

export interface NewChatMessageInput {
  userId: string;
  role: ChatRole;
  content: string;
  actionStatus?: SuggestedActionStatus | null;
}

export async function insertChatMessage(input: NewChatMessageInput): Promise<ChatMessage> {
  const [created] = await db
    .insert(chatMessages)
    .values({
      id: generateId(),
      userId: input.userId,
      role: input.role,
      content: input.content,
      actionStatus: input.actionStatus ?? null,
    })
    .returning();

  return toChatMessage(created);
}

export async function updateChatMessageActionStatus(
  id: string,
  actionStatus: SuggestedActionStatus
): Promise<void> {
  await db.update(chatMessages).set({ actionStatus }).where(eq(chatMessages.id, id));
}

export async function deleteAllChatMessages(userId: string): Promise<void> {
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}
