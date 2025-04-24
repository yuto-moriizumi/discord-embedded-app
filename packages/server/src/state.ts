import type { User } from "shared"; // User型をインポート

// ルームごとのカウンター状態を保持するMap
export const roomCounts = new Map<string, number>();
// ルームごとのユーザーリストを保持するMap
export const roomUsers = new Map<string, User[]>();

// ルームのカウントを取得または初期化する関数
export function getRoomCount(roomId: string): number {
  const count = roomCounts.get(roomId) || 0;
  if (!roomCounts.has(roomId)) {
    roomCounts.set(roomId, 0);
  }
  return count;
}

// ルームのカウントを増加させる関数
export function incrementRoomCount(roomId: string): number {
  const currentCount = getRoomCount(roomId);
  const newCount = currentCount + 1;
  roomCounts.set(roomId, newCount);
  return newCount;
}

// ルームのユーザーリストを取得または初期化する関数
export function getRoomUsers(roomId: string): User[] {
  const users = roomUsers.get(roomId) || [];
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, []);
  }
  return users;
}

// ルームにユーザーを追加する関数
export function addUserToRoom(roomId: string, user: User): User[] {
  const users = getRoomUsers(roomId);
  // 同じIDのユーザーがいない場合のみ追加
  if (!users.some((u) => u.id === user.id)) {
    users.push(user);
  }
  roomUsers.set(roomId, users); // 更新されたリストをセット
  return users; // 更新後のリストを返す
}

// ルームからユーザーを削除する関数
export function removeUserFromRoom(roomId: string, userId: string): User[] {
  let users = getRoomUsers(roomId);
  users = users.filter((user) => user.id !== userId);
  roomUsers.set(roomId, users);
  // ユーザーがいなくなったらルーム情報自体を削除
  if (users.length === 0) {
    roomUsers.delete(roomId);
    roomCounts.delete(roomId); // カウントも削除する場合
  }
  return users; // 更新後のリストを返す
}
