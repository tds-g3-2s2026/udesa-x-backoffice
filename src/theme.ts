import {
  Alert,
  Button,
  type CSSVariablesResolver,
  PasswordInput,
  Table,
  TextInput,
  createTheme,
  darken,
} from '@mantine/core';

/**
 * The visual defaults every screen inherits. Sizes and radii live here and
 * not on each component, so a form built in S3 and a table built in S4 match
 * without either one repeating the props.
 */
export const theme = createTheme({
  primaryColor: 'blue',
  // Shade 6 puts white text on blue at 3.6:1 and red at 3.3:1, under the 4.5:1
  // of WCAG AA. Shade 8 gives 5.0:1 and 4.5:1.
  primaryShade: 8,
  defaultRadius: 'md',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: '600' },
  components: {
    TextInput: TextInput.extend({ defaultProps: { size: 'md' } }),
    PasswordInput: PasswordInput.extend({ defaultProps: { size: 'md' } }),
    Button: Button.extend({ defaultProps: { size: 'md' } }),
    Alert: Alert.extend({ defaultProps: { radius: 'md' } }),
    Table: Table.extend({ defaultProps: { verticalSpacing: 'sm' } }),
  },
});

/** Light enough that their darkest shade on their own light background stays under 4.5:1. */
const PALE_COLORS = ['green', 'yellow', 'teal', 'orange'];

/**
 * The colors Mantine derives for secondary text and `light` badges fall under
 * WCAG AA: gray 6 on white is 3.3:1, and a green badge 3.8:1. They are
 * replaced here, from the same palette, so no screen sets a color of its own.
 */
export const cssVariablesResolver: CSSVariablesResolver = (current) => ({
  variables: {},
  light: {
    '--mantine-color-dimmed': 'var(--mantine-color-gray-7)',
    ...Object.fromEntries(
      PALE_COLORS.map((color) => [
        `--mantine-color-${color}-light-color`,
        darken(current.colors[color][9], 0.3),
      ])
    ),
  },
  dark: {
    '--mantine-color-dimmed': 'var(--mantine-color-dark-1)',
  },
});
