import { describe, expect, it } from 'vitest';

import { stripHtmlTags } from './stripHtml';

describe('stripHtmlTags', () => {
  it('removes simple inline tags', () => {
    expect(stripHtmlTags('<strong>Bravo</strong>')).toBe('Bravo');
  });

  it('does not glue concatenated block tags together', () => {
    expect(stripHtmlTags('<p>Acte</p><p>entraide</p>')).toBe('Acte entraide');
  });

  it('collapses the whitespace left behind by removed tags', () => {
    expect(stripHtmlTags('<p>Bravo</p>   <p>!</p>')).toBe('Bravo !');
  });

  it('returns plain text unchanged', () => {
    expect(stripHtmlTags('Acte d’entraide')).toBe('Acte d’entraide');
  });

  it('returns an empty string for markup with no text content', () => {
    expect(stripHtmlTags('<br/>')).toBe('');
  });
});
