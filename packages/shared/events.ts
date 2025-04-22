import { DefaultEventsMap } from "@socket.io/component-emitter";

export interface EventsMap extends DefaultEventsMap {
  joinRoom: (roomId: string) => void;
  updateCount: (count: number) => void;
  incrementCount: () => void;
}
