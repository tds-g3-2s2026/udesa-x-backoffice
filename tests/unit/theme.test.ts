import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME, type MantineTheme, mergeMantineTheme } from '@mantine/core';
import { cssVariablesResolver, theme } from '../../src/theme';

const merged: MantineTheme = mergeMantineTheme(DEFAULT_THEME, theme);
const resolved = cssVariablesResolver(merged);
const shade = merged.primaryShade as number;

/** A palette reference like `var(--mantine-color-gray-7)`, a hex or an `rgba()`, as RGB. */
const rgb = (color: string): number[] => {
  const reference = color.match(/^var\(--mantine-color-([a-z]+)-(\d)\)$/);
  if (reference) {
    return rgb(merged.colors[reference[1]][Number(reference[2])]);
  }
  if (color.startsWith('#')) {
    return [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
  }
  return (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
};

/** The WCAG 2.1 contrast ratio between two colors. */
const contrast = (foreground: string, background: string) => {
  const luminance = (color: string) => {
    const [r, g, b] = rgb(color)
      .map((channel) => channel / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};

const AA = 4.5;

describe('theme contrast', () => {
  it('T-48 - white text on filled buttons passes AA', () => {
    for (const color of ['blue', 'red']) {
      expect(contrast('#ffffff', merged.colors[color][shade]), color).toBeGreaterThanOrEqual(AA);
    }
  });

  it('T-48 - links and text in the primary color pass AA on white', () => {
    expect(contrast(merged.colors.blue[shade], '#ffffff')).toBeGreaterThanOrEqual(AA);
  });

  it('T-48 - secondary text passes AA in both color schemes', () => {
    const light = resolved.light['--mantine-color-dimmed'];
    const dark = resolved.dark['--mantine-color-dimmed'];
    expect(contrast(light, '#ffffff')).toBeGreaterThanOrEqual(AA);
    expect(contrast(light, merged.colors.gray[0])).toBeGreaterThanOrEqual(AA);
    expect(contrast(dark, merged.colors.dark[7])).toBeGreaterThanOrEqual(AA);
  });

  it('T-48 - text on light badges passes AA for every color the screens use', () => {
    for (const color of ['blue', 'red', 'gray', 'green', 'yellow', 'teal', 'orange']) {
      // Mantine's own default, unless the resolver replaces it.
      const text =
        resolved.light[`--mantine-color-${color}-light-color`] ?? merged.colors[color][9];
      expect(contrast(text, merged.colors[color][1]), color).toBeGreaterThanOrEqual(AA);
    }
  });
});
