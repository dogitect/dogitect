// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Pure helpers that compute per-card transform/opacity/z-index
 * styles for the scroll-driven stack used on the Insights pages.
 */

export interface CardStyle {
  readonly transform: string;
  readonly opacity: string;
  readonly zIndex: string;
  readonly pointerEvents: string;
  readonly boxShadow: string;
  readonly visibility?: string;
}

const BOX_SHADOW = '0 -20px 60px rgba(0, 0, 0, 0.5)';
const NO_SHADOW = 'none';

/** Maximum scale-down applied to the active card as it scrolls away. */
const ACTIVE_SCALE_REDUCTION = 0.05;

/** Maximum opacity dim applied to the active card as it scrolls away. */
const ACTIVE_OPACITY_REDUCTION = 0.3;

/** Progress threshold above which interaction passes to the next card. */
const POINTER_HANDOFF_PROGRESS = 0.5;

/** Translation distance (in %) for the next card sliding into view. */
const NEXT_CARD_OFFSET_PERCENT = 100;

/** Past cards in the "hidden" variant shrink to this scale before fading. */
const PAST_CARD_HIDDEN_SCALE = 0.95;

/** Returns the z-index for a "past" card (lowest tier in the stack). */
function pastZIndex(index: number): string {
  return String(index);
}

/** Returns the z-index for the active card (mid-tier above past cards). */
function activeZIndex(count: number, index: number): string {
  return String(count + index);
}

/** Returns the z-index for the incoming card (top of the stack). */
function incomingZIndex(count: number): string {
  return String(count * 2 + 1);
}

/**
 * Computes card styles for the "stacked" variant (Work Detail).
 * Past cards remain semi-visible behind the active card.
 *
 * @param count Total number of cards in the stack.
 * @param activeIndex Index of the currently-active card.
 * @param scrollProgress 0–1 fraction of the scroll into the next card.
 * @returns A `CardStyle` for each card index, in order.
 */
export function computeStackedCardStyles(
  count: number,
  activeIndex: number,
  scrollProgress: number
): CardStyle[] {
  return Array.from({ length: count }, (_, index) => {
    if (index < activeIndex) {
      return {
        transform: 'translateY(0) scale(1)',
        opacity: '0.7',
        zIndex: pastZIndex(index),
        pointerEvents: 'none',
        boxShadow: BOX_SHADOW,
      };
    }
    if (index === activeIndex) {
      const scale = 1 - scrollProgress * ACTIVE_SCALE_REDUCTION;
      const opacity = 1 - scrollProgress * ACTIVE_OPACITY_REDUCTION;
      return {
        transform: `translateY(0) scale(${scale})`,
        opacity: String(opacity),
        zIndex: activeZIndex(count, index),
        pointerEvents:
          scrollProgress < POINTER_HANDOFF_PROGRESS ? 'auto' : 'none',
        boxShadow: BOX_SHADOW,
      };
    }
    if (index === activeIndex + 1) {
      const translateY = (1 - scrollProgress) * NEXT_CARD_OFFSET_PERCENT;
      return {
        transform: `translateY(${translateY}%)`,
        opacity: '1',
        zIndex: incomingZIndex(count),
        pointerEvents:
          scrollProgress > POINTER_HANDOFF_PROGRESS ? 'auto' : 'none',
        boxShadow: scrollProgress > 0 ? BOX_SHADOW : NO_SHADOW,
      };
    }
    return {
      transform: 'translateY(100%)',
      opacity: '1',
      zIndex: pastZIndex(index),
      pointerEvents: 'none',
      boxShadow: NO_SHADOW,
    };
  });
}

/**
 * Computes card styles for the "hidden" variant (Insights).
 * Past cards are hidden from view entirely.
 *
 * @param count Total number of cards in the stack.
 * @param activeIndex Index of the currently-active card.
 * @param scrollProgress 0–1 fraction of the scroll into the next card.
 * @returns A `CardStyle` for each card index, in order.
 */
export function computeHiddenCardStyles(
  count: number,
  activeIndex: number,
  scrollProgress: number
): CardStyle[] {
  return Array.from({ length: count }, (_, index) => {
    if (index < activeIndex) {
      return {
        transform: `translateY(0) scale(${PAST_CARD_HIDDEN_SCALE})`,
        opacity: '0',
        visibility: 'hidden',
        zIndex: pastZIndex(index),
        pointerEvents: 'none',
        boxShadow: NO_SHADOW,
      };
    }
    if (index === activeIndex) {
      const scale = 1 - scrollProgress * ACTIVE_SCALE_REDUCTION;
      const opacity = 1 - scrollProgress * ACTIVE_OPACITY_REDUCTION;
      return {
        transform: `translateY(0) scale(${scale})`,
        opacity: String(opacity),
        visibility: 'visible',
        zIndex: activeZIndex(count, index),
        pointerEvents:
          scrollProgress < POINTER_HANDOFF_PROGRESS ? 'auto' : 'none',
        boxShadow: BOX_SHADOW,
      };
    }
    if (index === activeIndex + 1) {
      const translateY = (1 - scrollProgress) * NEXT_CARD_OFFSET_PERCENT;
      return {
        transform: `translateY(${translateY}%)`,
        opacity: '1',
        visibility: 'visible',
        zIndex: incomingZIndex(count),
        pointerEvents:
          scrollProgress > POINTER_HANDOFF_PROGRESS ? 'auto' : 'none',
        boxShadow: scrollProgress > 0 ? BOX_SHADOW : NO_SHADOW,
      };
    }
    return {
      transform: 'translateY(100%)',
      opacity: '1',
      visibility: 'hidden',
      zIndex: pastZIndex(index),
      pointerEvents: 'none',
      boxShadow: NO_SHADOW,
    };
  });
}
