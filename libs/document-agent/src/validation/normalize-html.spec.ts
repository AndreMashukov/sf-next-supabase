import { describe, expect, it } from 'vitest';
import { encodeBareAmpersands } from './normalize-html';

describe('encodeBareAmpersands', () => {
  it('encodes bare ampersands in LaTeX matrices', () => {
    expect(encodeBareAmpersands('<p>$$\\begin{bmatrix}a & b\\\\c & d\\end{bmatrix}$$</p>')).toBe(
      '<p>$$\\begin{bmatrix}a &amp; b\\\\c &amp; d\\end{bmatrix}$$</p>',
    );
  });

  it('does not double-encode existing entities', () => {
    expect(encodeBareAmpersands('<p>A &amp; B &#38; C &#x26; D</p>')).toBe(
      '<p>A &amp; B &#38; C &#x26; D</p>',
    );
  });
});
