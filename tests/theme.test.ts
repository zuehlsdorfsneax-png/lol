import { afterEach, describe, expect, it } from 'vitest';
import { chooseTheme, initTheme } from '../src/ui/theme';

const root = document.documentElement;

afterEach(() => {
  localStorage.clear();
  root.removeAttribute('data-theme');
});

describe('Farbschema', () => {
  it('ohne Wahl bleibt das System zuständig', () => {
    initTheme();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('die Wahl wird gemerkt und beim nächsten Start angewendet', () => {
    initTheme();
    chooseTheme('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    root.removeAttribute('data-theme');
    initTheme();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('„Automatisch“ stellt das Schema der einbettenden Seite wieder her', () => {
    root.setAttribute('data-theme', 'light');
    initTheme();
    chooseTheme('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    chooseTheme('auto');
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('orbitlabor-theme')).toBeNull();
  });
});
