type EventCallback = (data: any) => void;

class RealtimeSocket {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectInterval = 3000;
  private isConnecting = false;
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  public isConnected = false;

  private wsUrl: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/dashboard';

  constructor() {
    this.listeners.set('*', new Set());
  }

  connect(url?: string) {
    if (typeof window === 'undefined') return;
    if (url) {
      this.wsUrl = url;
    } else if (process.env.NEXT_PUBLIC_WS_URL) {
      this.wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    }
    
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.notifyStatus(true);
        console.log('[WebSocket] Connected to Clinic Real-time Gateway');
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventType, data } = payload;
          
          // Dispatch to specific event listeners
          if (this.listeners.has(eventType)) {
            this.listeners.get(eventType)?.forEach((cb) => cb(data));
          }
          // Dispatch to wildcard listeners
          this.listeners.get('*')?.forEach((cb) => cb({ event: eventType, data }));
        } catch (e) {
          // plain text pong
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus(false);
        console.log('[WebSocket] Disconnected. Reconnecting in 3s...');
        setTimeout(() => this.connect(url), this.reconnectInterval);
      };

      this.socket.onerror = (err) => {
        console.warn('[WebSocket] Connection error:', err);
        this.socket?.close();
      };
    } catch (e) {
      this.isConnecting = false;
      this.isConnected = false;
      this.notifyStatus(false);
      setTimeout(() => this.connect(url), this.reconnectInterval);
    }
  }

  subscribe(eventType: string, callback: EventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  onStatusChange(callback: (connected: boolean) => void) {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((cb) => cb(connected));
  }
}

export const realtimeSocket = new RealtimeSocket();
