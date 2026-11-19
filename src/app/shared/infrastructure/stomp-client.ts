import { effect, inject, Injectable, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable } from 'rxjs';
import { AuthStore } from '../../auth/application/auth.store';
import { environment } from '../../../environments/environment';

interface Watcher {
  destination: string;
  onMessage: (message: IMessage) => void;
  subscription: StompSubscription | null;
}

/**
 * Single STOMP connection to the backend broker, shared by the whole app.
 *
 * - Connects while there is a session token and disconnects on logout; the JWT goes on the
 *   CONNECT frame because browsers can't set headers on the WebSocket handshake.
 * - Reconnects on its own and re-subscribes every live {@link watch} after each reconnect.
 * - {@link connected} lets stores fall back to polling only while the socket is down.
 */
@Injectable({ providedIn: 'root' })
export class StompClient {

  private static readonly RECONNECT_DELAY_MS = 3000;

  private readonly auth = inject(AuthStore);

  private readonly connectedSignal = signal(false);
  readonly connected = this.connectedSignal.asReadonly();

  private readonly watchers = new Set<Watcher>();
  private client: Client | null = null;

  constructor() {
    effect(() => {
      const token = this.auth.token();
      this.disconnect();
      if (token) this.connect(token);
    });
  }

  /** Messages published on `destination`, parsed as JSON. Unsubscribing stops the STOMP subscription. */
  watch<T>(destination: string): Observable<T> {
    return new Observable<T>(observer => {
      const watcher: Watcher = {
        destination,
        subscription: null,
        onMessage: message => {
          try {
            observer.next(JSON.parse(message.body) as T);
          } catch {
            // A malformed frame must not tear down the subscription.
          }
        },
      };
      this.watchers.add(watcher);
      if (this.client?.connected) this.subscribe(watcher);
      return () => {
        this.watchers.delete(watcher);
        if (watcher.subscription && this.client?.connected) watcher.subscription.unsubscribe();
        watcher.subscription = null;
      };
    });
  }

  private connect(token: string): void {
    const client = new Client({
      brokerURL: StompClient.resolveBrokerUrl(environment.wsUrl),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: StompClient.RECONNECT_DELAY_MS,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
    });
    client.onConnect = () => {
      this.connectedSignal.set(true);
      this.watchers.forEach(w => this.subscribe(w));
    };
    client.onWebSocketClose = () => {
      this.connectedSignal.set(false);
      this.watchers.forEach(w => (w.subscription = null));
    };
    client.onStompError = () => this.connectedSignal.set(false);
    this.client = client;
    client.activate();
  }

  private disconnect(): void {
    if (!this.client) return;
    const client = this.client;
    this.client = null;
    this.connectedSignal.set(false);
    this.watchers.forEach(w => (w.subscription = null));
    void client.deactivate();
  }

  private subscribe(watcher: Watcher): void {
    watcher.subscription = this.client!.subscribe(watcher.destination, watcher.onMessage);
  }

  /** A path such as `/ws/websocket` is resolved against the page origin (served behind the same proxy). */
  private static resolveBrokerUrl(url: string): string {
    if (!url.startsWith('/')) return url;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${url}`;
  }
}
