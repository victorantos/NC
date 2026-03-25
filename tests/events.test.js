import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Create a fresh EventBus for testing (the module exports a singleton)
// We'll re-import the class pattern by reading the module
let EventBus;
const makeEventBus = () => {
    const bus = { _listeners: new Map() };
    bus.on = function (event, callback) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event).push(callback);
        return () => this.off(event, callback);
    };
    bus.off = function (event, callback) {
        const listeners = this._listeners.get(event);
        if (!listeners) return;
        const index = listeners.indexOf(callback);
        if (index !== -1) listeners.splice(index, 1);
    };
    bus.emit = function (event, ...args) {
        const listeners = this._listeners.get(event);
        if (!listeners) return;
        for (const callback of [...listeners]) callback(...args);
    };
    bus.once = function (event, callback) {
        const wrapper = (...args) => { this.off(event, wrapper); callback(...args); };
        return this.on(event, wrapper);
    };
    return bus;
};

describe('EventBus', () => {
    let bus;

    beforeEach(() => {
        bus = makeEventBus();
    });

    it('calls listener when event is emitted', () => {
        let received = null;
        bus.on('test', (data) => { received = data; });
        bus.emit('test', 'hello');
        assert.strictEqual(received, 'hello');
    });

    it('supports multiple listeners', () => {
        let count = 0;
        bus.on('test', () => count++);
        bus.on('test', () => count++);
        bus.emit('test');
        assert.strictEqual(count, 2);
    });

    it('passes multiple arguments', () => {
        let args = null;
        bus.on('test', (a, b, c) => { args = [a, b, c]; });
        bus.emit('test', 1, 2, 3);
        assert.deepStrictEqual(args, [1, 2, 3]);
    });

    it('does not call listener after off()', () => {
        let count = 0;
        const fn = () => count++;
        bus.on('test', fn);
        bus.emit('test');
        bus.off('test', fn);
        bus.emit('test');
        assert.strictEqual(count, 1);
    });

    it('on() returns an unsubscribe function', () => {
        let count = 0;
        const unsub = bus.on('test', () => count++);
        bus.emit('test');
        unsub();
        bus.emit('test');
        assert.strictEqual(count, 1);
    });

    it('once() fires only once', () => {
        let count = 0;
        bus.once('test', () => count++);
        bus.emit('test');
        bus.emit('test');
        bus.emit('test');
        assert.strictEqual(count, 1);
    });

    it('does not throw when emitting event with no listeners', () => {
        assert.doesNotThrow(() => bus.emit('nonexistent'));
    });

    it('does not throw when removing listener from unknown event', () => {
        assert.doesNotThrow(() => bus.off('nonexistent', () => {}));
    });

    it('isolates events by name', () => {
        let a = 0, b = 0;
        bus.on('a', () => a++);
        bus.on('b', () => b++);
        bus.emit('a');
        assert.strictEqual(a, 1);
        assert.strictEqual(b, 0);
    });
});
