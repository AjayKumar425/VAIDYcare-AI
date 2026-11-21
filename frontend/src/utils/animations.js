// frontend/src/utils/animations.js
// Subtle, high-performance GSAP animations (SplitText, ScrollTrigger, Micro-interactions)
// Designed for a premium clinical aesthetic — zero AI slop, zero distracting bounces.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/**
 * Check if the user has requested reduced motion in their OS
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * SplitText subtle word/character reveal (Apple / Linear style).
 * Splits text into words, animates with gentle micro-elevation, and reverts DOM on complete.
 */
export const animateSplitText = (target, options = {}) => {
  if (!target || prefersReducedMotion()) return null;

  try {
    const type = options.type || 'words';
    const split = new SplitText(target, { type });
    const elements = type.includes('chars') ? split.chars : split.words;

    gsap.set(elements, { willChange: 'transform, opacity' });

    const tween = gsap.fromTo(
      elements,
      {
        opacity: 0,
        y: options.y ?? 8,
      },
      {
        opacity: 1,
        y: 0,
        duration: options.duration ?? 0.4,
        stagger: options.stagger ?? 0.025,
        ease: options.ease ?? 'power2.out',
        delay: options.delay ?? 0,
        clearProps: 'willChange',
        onComplete: () => {
          if (options.revert !== false) {
            split.revert();
          }
          if (options.onComplete) options.onComplete();
        },
      }
    );

    return { split, tween };
  } catch (err) {
    console.warn('SplitText animation skipped:', err);
    return null;
  }
};

/**
 * Smooth, subtle stagger reveal for cards, lists, or badge chips.
 */
export const animateStaggerCards = (elements, options = {}) => {
  if (!elements || prefersReducedMotion()) return null;

  return gsap.fromTo(
    elements,
    {
      opacity: 0,
      y: options.y ?? 10,
    },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? 0.35,
      stagger: options.stagger ?? 0.04,
      ease: options.ease ?? 'power2.out',
      delay: options.delay ?? 0,
      clearProps: 'transform',
    }
  );
};

/**
 * Subtle ScrollTrigger entrance for sections as they scroll into view.
 */
export const animateOnScroll = (element, options = {}) => {
  if (!element || prefersReducedMotion()) return null;

  return gsap.fromTo(
    element,
    {
      opacity: 0,
      y: options.y ?? 14,
    },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? 0.45,
      ease: options.ease ?? 'power2.out',
      clearProps: 'transform',
      scrollTrigger: {
        trigger: element,
        start: options.start ?? 'top 90%',
        once: true,
        ...options.scrollTrigger,
      },
    }
  );
};

/**
 * Micro-transition when switching tabs, steps, or views.
 */
export const animateTabTransition = (container, options = {}) => {
  if (!container || prefersReducedMotion()) return null;

  return gsap.fromTo(
    container,
    {
      opacity: 0,
      y: options.y ?? 6,
    },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? 0.22,
      ease: options.ease ?? 'power2.out',
      clearProps: 'transform',
    }
  );
};

/**
 * Subtle elevated pop-in for appointment slips, tokens, or QR cards.
 */
export const animateScaleIn = (element, options = {}) => {
  if (!element || prefersReducedMotion()) return null;

  return gsap.fromTo(
    element,
    {
      opacity: 0,
      scale: options.fromScale ?? 0.97,
      y: options.y ?? 12,
    },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: options.duration ?? 0.4,
      ease: options.ease ?? 'power2.out',
      clearProps: 'transform',
    }
  );
};

export { gsap, ScrollTrigger, SplitText };
