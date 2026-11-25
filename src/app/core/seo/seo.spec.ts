// Copyright 2026 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { buildOgImageUrl } from '../images/image-delivery';
import { IMAGE_MANIFEST } from '../images/image-manifest.generated';
import { Seo } from './seo';

describe('Seo', () => {
  let service: Seo;
  let meta: Meta;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Seo, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    service = TestBed.inject(Seo);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updatePageSeo', () => {
    it('should update title for non-homepage', () => {
      const spy = vi.spyOn(title, 'setTitle');

      service.updatePageSeo({
        title: 'Insights',
        description: 'Test description',
        canonicalPath: '/insights',
      });

      expect(spy).toHaveBeenCalledWith('Insights | dogitect');
    });

    it('should not append suffix for homepage', () => {
      const spy = vi.spyOn(title, 'setTitle');

      service.updatePageSeo({
        title: 'dogitect — Independent AI and cloud solutions architect',
        description: 'Test description',
        canonicalPath: '/',
        isHomepage: true,
      });

      expect(spy).toHaveBeenCalledWith(
        'dogitect — Independent AI and cloud solutions architect'
      );
    });

    it('should update meta description', () => {
      const spy = vi.spyOn(meta, 'updateTag');

      service.updatePageSeo({
        title: 'Insights',
        description: 'Custom description',
        canonicalPath: '/insights',
      });

      expect(spy).toHaveBeenCalledWith({
        name: 'description',
        content: 'Custom description',
      });
    });

    it('should update Open Graph tags', () => {
      const spy = vi.spyOn(meta, 'updateTag');

      service.updatePageSeo({
        title: 'Insights',
        description: 'Test description',
        canonicalPath: '/insights',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ property: 'og:title' })
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ property: 'og:description' })
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ property: 'og:url' })
      );
    });
  });

  describe('getWorkOgImage', () => {
    it('should build a case image URL for the active environment', () => {
      const path = 'images/insights/inference-platform.png';
      const result = service.getWorkOgImage(path);

      expect(result).toBe(
        buildOgImageUrl(path, IMAGE_MANIFEST[path], environment.assetsUrl)
      );
    });
  });

  describe('setPageSeo', () => {
    it('should set Insights SEO correctly', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setPageSeo('insights');

      expect(titleSpy).toHaveBeenCalledWith('Insights | dogitect');
    });

    it('should set Contact SEO correctly', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setPageSeo('contact');

      expect(titleSpy).toHaveBeenCalledWith('Contact | dogitect');
    });

    it('should set Home SEO correctly', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setPageSeo('home');

      expect(titleSpy).toHaveBeenCalledWith(
        'dogitect — Independent AI and cloud solutions architect'
      );
    });

    it('should set case SEO from the case itself', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setCaseSeo({
        slug: 'inference-platform',
        title: 'Inference Platform',
        description: 'Routing, capacity, and an evaluation gate.',
        imagePath: 'images/insights/inference-platform.png',
      });

      expect(titleSpy).toHaveBeenCalledWith('Inference Platform | dogitect');
    });
  });
});
