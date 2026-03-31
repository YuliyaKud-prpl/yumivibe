function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixWithWhite(rgb: { r: number; g: number; b: number }, amount: number): string {
  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function mixWithBlack(rgb: { r: number; g: number; b: number }, amount: number): string {
  const r = Math.round(rgb.r * (1 - amount));
  const g = Math.round(rgb.g * (1 - amount));
  const b = Math.round(rgb.b * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export function getDashboardCssVars(accent: string): Record<string, string> {
  const rgb = hexToRgb(accent);

  return {
    '--color-surface-container-lowest': '#FFFFFF',
    '--color-surface-container-low': mixWithWhite(rgb, 0.94),
    '--color-surface-container': mixWithWhite(rgb, 0.9),
    '--color-surface-container-high': mixWithWhite(rgb, 0.86),
    '--color-surface-container-highest': mixWithWhite(rgb, 0.82),
    '--color-surface': mixWithWhite(rgb, 0.96),
    '--color-surface-variant': mixWithWhite(rgb, 0.88),
    '--color-surface-dim': mixWithWhite(rgb, 0.84),
    '--color-surface-bright': mixWithWhite(rgb, 0.96),
    '--color-outline-variant': mixWithWhite(rgb, 0.72),
    '--color-outline': mixWithBlack(rgb, 0.35),
    '--color-on-surface-variant': mixWithBlack(rgb, 0.65),
  };
}
