/**
 * @jest-environment jsdom
 */

import { buildCard, nextColor } from '../shared/js/renderer.js';
import { AppState } from '../shared/js/state.js';
import { TEAM_COLORS } from '../shared/js/config.js';

describe('Renderer JS Features', () => {
  beforeAll(() => {
    // Expose a mock DOMPurify globally to avoid ESM/Jest node_modules issues
    global.DOMPurify = {
      sanitize: (str) => {
        if (typeof str !== 'string') return '';
        // Very basic mock sanitization just for the tests
        return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    };
  });

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    AppState.colorIdx = 0;
  });

  it('generates the next color sequentially', () => {
    const firstColor = nextColor();
    const secondColor = nextColor();
    expect(firstColor).toBe(TEAM_COLORS[0]);
    expect(secondColor).toBe(TEAM_COLORS[1]);
  });

  it('builds a team card with default values when empty', () => {
    const card = buildCard({});
    expect(card.className).toBe('team-card');
    
    // Check default fallbacks
    const title = card.querySelector('.card-title');
    expect(title.textContent).toBe('Team Name');
    
    const tag = card.querySelector('.card-tag');
    expect(tag.textContent).toBe('TEAM TAG');

    // Check if card body is built
    const members = card.querySelectorAll('.mem-row');
    expect(members.length).toBe(0); // empty members array
  });

  it('builds a team card with provided data', () => {
    const testData = {
      id: 'test_123',
      color: '#ff0000',
      tag: 'T1',
      title: 'Awesome Team',
      desc: 'Description here',
      members: [
        { name: 'Alice', bind: 'D' },
        { name: 'Bob', bind: 'F' }
      ]
    };

    const card = buildCard(testData);

    expect(card.style.getPropertyValue('--tc')).toBe('#ff0000');
    expect(card.querySelector('.card-tag').textContent).toBe('T1');
    expect(card.querySelector('.card-title').textContent).toBe('Awesome Team');
    expect(card.querySelector('.card-desc').textContent).toBe('Description here');

    const members = card.querySelectorAll('.mem-row');
    expect(members.length).toBe(2);
    expect(members[0].querySelector('.mem-name').textContent).toBe('Alice');
    expect(members[0].querySelector('.mem-bind').textContent).toBe('D');
    expect(members[1].querySelector('.mem-name').textContent).toBe('Bob');
    expect(members[1].querySelector('.mem-bind').textContent).toBe('F');
  });

  it('escapes and sanitizes HTML inputs correctly to prevent XSS', () => {
    const testData = {
      title: '<script>alert("xss")</script>Hack',
      color: '"><script>alert(1)</script>'
    };

    const card = buildCard(testData);
    
    // Because sanitizeHTML is used, script tags should be stripped
    // We expect "Hack" or empty if DOMPurify strips the whole invalid string
    const title = card.querySelector('.card-title').innerHTML;
    expect(title).not.toContain('<script>');

    const cssVar = card.style.getPropertyValue('--tc');
    expect(cssVar).not.toContain('"><script>');
  });
});
