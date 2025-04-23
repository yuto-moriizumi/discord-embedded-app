import { DefaultEventsMap } from "@socket.io/component-emitter";

// ユーザー情報を表す型
export interface User {
  id: string; // Socket IDなど、一意な識別子
  name: string; // ユーザー名（仮） - 将来的にはDiscordのユーザー名など
}

export interface EventsMap extends DefaultEventsMap {
  // joinRoomイベントにuserIdとuserNameを追加
  joinRoom: (roomId: string, userId: string, userName: string) => void;
  updateCount: (count: number) => void;
  incrementCount: () => void;
  updateUsers: (users: User[]) => void; // ユーザーリスト更新イベントを追加
}
