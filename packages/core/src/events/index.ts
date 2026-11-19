import { randomUUID } from 'node:crypto'
import { rootLogger } from '../logger/index'

export interface DomainEvent<T = unknown> {
  id: string
  name: string
  payload: T
  occurredAt: Date
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void

/**
 * The only sanctioned way for one module to affect another. Modules never
 * import each other's internals, so deleting a subscriber can never break a
 * publisher — the event simply has one fewer listener.
 *
 * ponytail: in-process only, so listeners must live in the same API instance.
 * Swap the transport for Redis pub/sub when modules need to react across
 * replicas; the `on`/`emit` surface stays the same.
 */
export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>()

  on<T = unknown>(name: string, handler: EventHandler<T>): () => void {
    const existing = this.handlers.get(name) ?? new Set<EventHandler>()
    existing.add(handler as EventHandler)
    this.handlers.set(name, existing)

    return () => {
      existing.delete(handler as EventHandler)
    }
  }

  async emit<T = unknown>(name: string, payload: T): Promise<void> {
    const listeners = this.handlers.get(name)
    if (!listeners || listeners.size === 0) return

    const event: DomainEvent<T> = { id: randomUUID(), name, payload, occurredAt: new Date() }

    await Promise.all(
      [...listeners].map(async (handler) => {
        try {
          await handler(event as DomainEvent)
        } catch (error) {
          // A failing listener must not fail the request that published the event.
          rootLogger().error({ err: error, event: name }, 'event listener failed')
        }
      }),
    )
  }

  /** Event names that currently have at least one listener. */
  listenedEvents(): string[] {
    return [...this.handlers.entries()]
      .filter(([, listeners]) => listeners.size > 0)
      .map(([name]) => name)
  }
}