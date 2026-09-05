import { Alert, Button, PasswordInput, Table, TextInput, createTheme } from '@mantine/core';

/**
 * The visual defaults every screen inherits. Sizes and radii live here and
 * not on each component, so a form built in S3 and a table built in S4 match
 * without either one repeating the props.
 */
export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: 6,
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
