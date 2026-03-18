/**
 * Minimal pub/sub EventBus for inter-module communication.
 */
class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Add a listener for the given event.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Remove a specific listener for the given event.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event, calling all registered listeners with the provided arguments.
   * @param {string} event
   * @param {...*} args
   */
  emit(event, ...args) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    for (const callback of [...listeners]) {
      callback(...args);
    }
  }

  /**
   * Listen for an event once, then auto-remove the listener.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }
}

export const eventBus = new EventBus();
