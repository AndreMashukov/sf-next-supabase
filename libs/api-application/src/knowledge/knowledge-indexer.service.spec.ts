import { describe, expect, it } from 'vitest';
import { chunkText, hashContent, stripHtmlToText } from './knowledge-indexer.service';

describe('knowledge indexer helpers', () => {
  it('strips html to plain text', () => {
    expect(stripHtmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('chunks long text with overlap', () => {
    const text = 'a'.repeat(1000);
    const chunks = chunkText(text, 400, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.length).toBeLessThanOrEqual(400);
  });

  it('hashes content consistently', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
    expect(hashContent('hello')).not.toBe(hashContent('world'));
  });
});
