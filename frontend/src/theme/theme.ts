export interface ThemeConfig {
  brandColor: string;
  surface: string;
  radius: string;
  density: 'comfortable' | 'compact';
  mode: 'light' | 'dark';
}

export const defaultTheme: ThemeConfig = {
  brandColor: '#2563eb', surface: '#f6f8fb', radius: '16px', density: 'comfortable', mode: 'light'
};

export function applyTheme(config: Partial<ThemeConfig>): ThemeConfig {
  const theme = { ...defaultTheme, ...config };
  const root = document.documentElement;
  root.style.setProperty('--brand', /^#[0-9a-f]{6}$/i.test(theme.brandColor) ? theme.brandColor : defaultTheme.brandColor);
  root.style.setProperty('--surface', theme.surface || defaultTheme.surface);
  root.style.setProperty('--radius', /^\d+(px|rem)$/.test(theme.radius) ? theme.radius : defaultTheme.radius);
  root.dataset.mode = theme.mode === 'dark' ? 'dark' : 'light';
  root.dataset.density = theme.density === 'compact' ? 'compact' : 'comfortable';
  return theme;
}
