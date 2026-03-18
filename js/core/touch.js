import { eventBus } from './events.js';

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let longPressTimer = null;
const SWIPE_THRESHOLD = 50;    // px
const LONG_PRESS_MS = 500;

/**
 * Initialize touch/pointer gesture handling on the panels container.
 * Emits swipe and long-press events via the EventBus.
 */
export function initTouch() {
  const panels = document.querySelector('.panels-container');
  if (!panels) return;

  panels.addEventListener('touchstart', onTouchStart, { passive: false });
  panels.addEventListener('touchmove', onTouchMove, { passive: false });
  panels.addEventListener('touchend', onTouchEnd);
  panels.addEventListener('touchcancel', onTouchCancel);
}

function onTouchStart(e) {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();

  // Start long press timer
  longPressTimer = setTimeout(() => {
    eventBus.emit('touch:longpress', {
      x: touch.clientX,
      y: touch.clientY,
      target: e.target
    });
  }, LONG_PRESS_MS);
}

function onTouchMove(e) {
  // Cancel long press if moved too much
  if (longPressTimer) {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }
}

function onTouchEnd(e) {
  clearTimeout(longPressTimer);
  longPressTimer = null;

  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const elapsed = Date.now() - touchStartTime;

  // Detect horizontal swipe (dx big, dy small, quick)
  if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD * 1.5 && elapsed < 500) {
    if (dx > 0) {
      eventBus.emit('swipe:right');
    } else {
      eventBus.emit('swipe:left');
    }
  }
}

function onTouchCancel() {
  clearTimeout(longPressTimer);
  longPressTimer = null;
}

export function destroyTouch() {
  const panels = document.querySelector('.panels-container');
  if (!panels) return;

  panels.removeEventListener('touchstart', onTouchStart);
  panels.removeEventListener('touchmove', onTouchMove);
  panels.removeEventListener('touchend', onTouchEnd);
  panels.removeEventListener('touchcancel', onTouchCancel);
}
