/**
 * Simple in-memory rate limiter for request throttling
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface ClientData {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

export class RateLimiter {
  private clients = new Map<string, ClientData>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  check(clientId: string): RateLimitResult {
    const now = Date.now();
    const clientData = this.clients.get(clientId);

    if (!clientData || now >= clientData.resetTime) {
      // First request or window has expired
      const resetTime = now + this.config.windowMs;
      this.clients.set(clientId, {
        count: 1,
        resetTime,
        firstRequestTime: now,
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
      };
    }

    if (clientData.count >= this.config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: clientData.resetTime,
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      };
    }

    // Increment count and allow request
    clientData.count++;
    this.clients.set(clientId, clientData);

    return {
      allowed: true,
      remaining: this.config.maxRequests - clientData.count,
      resetTime: clientData.resetTime,
    };
  }

  reset(clientId: string): void {
    this.clients.delete(clientId);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [clientId, data] of this.clients.entries()) {
      if (now >= data.resetTime) {
        this.clients.delete(clientId);
      }
    }
  }

  getStats(): { totalClients: number; activeClients: number } {
    const now = Date.now();
    let activeClients = 0;

    for (const data of this.clients.values()) {
      if (now < data.resetTime) {
        activeClients++;
      }
    }

    return {
      totalClients: this.clients.size,
      activeClients,
    };
  }
}

// Default rate limiter instance
export const defaultRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 1 minute
});
