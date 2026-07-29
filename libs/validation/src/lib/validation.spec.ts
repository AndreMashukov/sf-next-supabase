import { countWords } from '@sf/shared-types';
import { textToHtml } from '../index';

describe('textToHtml', () => {
  it('wraps plain text in HTML paragraphs', () => {
    const html = textToHtml('Hello world');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<p>Hello world</p>');
  });

  it('escapes HTML characters', () => {
    const html = textToHtml('<script>alert(1)</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('splits paragraphs on blank lines', () => {
    const html = textToHtml('First paragraph\n\nSecond paragraph');

    expect(html).toContain('<p>First paragraph</p>');
    expect(html).toContain('<p>Second paragraph</p>');
  });
});

describe('countWords', () => {
  it('counts words in text', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('returns 0 for empty text', () => {
    expect(countWords('   ')).toBe(0);
  });
});
