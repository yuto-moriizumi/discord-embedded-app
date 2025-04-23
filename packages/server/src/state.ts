// ルームごとのカウンター状態を保持するMap
export const roomCounts = new Map<string, number>();

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
