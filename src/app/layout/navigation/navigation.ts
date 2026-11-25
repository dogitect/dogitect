// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Header navigation with hamburger menu and focus-trap. */

import type { ElementRef } from '@angular/core';
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UiState } from '../../core/ui-state/ui-state';

/** Single entry in the top navigation bar. */
interface NavItem {
  readonly label: string;
  readonly href: string;
}

/** Header navigation with hamburger menu. */
@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
  imports: [RouterLink],
})
export class Navigation {
  private readonly uiState = inject(UiState);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  private readonly menuRef = viewChild<ElementRef<HTMLElement>>('menu');

  protected readonly isMenuOpen = signal(false);

  protected readonly isHidden = this.uiState.navigationHidden;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Overview', href: '/' },
    { label: 'Insights', href: '/insights' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  constructor() {
    afterNextRender(() => {
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && this.isMenuOpen()) {
          this.closeMenu();
        }
      };

      this.document.addEventListener('keydown', onKeyDown);

      this.destroyRef.onDestroy(() => {
        this.document.removeEventListener('keydown', onKeyDown);
      });
    });
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
    if (this.isMenuOpen()) {
      // Focus first menu item after DOM update.
      queueMicrotask(() => {
        const menu = this.menuRef()?.nativeElement;
        const firstLink = menu?.querySelector<HTMLElement>('a');
        firstLink?.focus();
      });
    }
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  /** Keeps Tab inside the open menu. Activation is left to the link itself. */
  protected keepFocusInMenu(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.isMenuOpen()) {
      return;
    }

    const menu = this.menuRef()?.nativeElement;
    if (!menu) {
      return;
    }

    const focusable = menu.querySelectorAll<HTMLElement>('a');
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
