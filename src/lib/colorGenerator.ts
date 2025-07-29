// Predefined beautiful colors that work well for categories
const PREDEFINED_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#dc2626', // red-600
  '#ca8a04', // yellow-600
  '#16a34a', // green-600
  '#2563eb', // blue-600
  '#9333ea', // purple-600
  '#0891b2', // cyan-600
  '#65a30d', // lime-600
  '#d97706', // amber-600
  '#059669', // emerald-600
  '#7c3aed', // violet-600
  '#db2777', // pink-600
  '#0d9488', // teal-600
];

// Function to convert hex to HSL for better color comparison
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

// Function to convert HSL back to hex
function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1/3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1/3);

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Calculate color distance using Delta E (perceptual color difference)
function calculateColorDistance(color1: string, color2: string): number {
  const [h1, s1, l1] = hexToHsl(color1);
  const [h2, s2, l2] = hexToHsl(color2);

  // Simplified Delta E calculation focusing on hue, saturation, and lightness
  const deltaH = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
  const deltaS = Math.abs(s1 - s2);
  const deltaL = Math.abs(l1 - l2);

  // Weighted distance calculation (hue difference is most important)
  return Math.sqrt((deltaH * 2) ** 2 + (deltaS * 1.5) ** 2 + (deltaL * 1) ** 2);
}

// Generate a random color that's visually distinct from existing colors
function generateDistinctColor(existingColors: string[], minDistance = 40): string {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Generate random HSL values for better color distribution
    const hue = Math.floor(Math.random() * 360);
    const saturation = 50 + Math.floor(Math.random() * 40); // 50-90% for vibrant colors
    const lightness = 40 + Math.floor(Math.random() * 30); // 40-70% for good contrast

    const newColor = hslToHex(hue, saturation, lightness);

    // Check if this color is distinct enough from all existing colors
    const isDistinct = existingColors.every(existingColor => 
      calculateColorDistance(newColor, existingColor) >= minDistance
    );

    if (isDistinct) {
      return newColor;
    }

    attempts++;
  }

  // Fallback: if we can't find a distinct color, return a random predefined color
  // that's not in the existing colors
  const availablePredefined = PREDEFINED_COLORS.filter(color => 
    !existingColors.includes(color.toLowerCase())
  );

  if (availablePredefined.length > 0) {
    return availablePredefined[Math.floor(Math.random() * availablePredefined.length)];
  }

  // Ultimate fallback: return a completely random color
  return `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
}

// Main function to get a unique color for a new category
export function generateUniqueColor(existingColors: string[]): string {
  // Normalize existing colors to lowercase for comparison
  const normalizedExisting = existingColors.map(color => color.toLowerCase());

  // First, try to use predefined colors that aren't already used
  const availablePredefined = PREDEFINED_COLORS.filter(color => 
    !normalizedExisting.includes(color.toLowerCase())
  );

  if (availablePredefined.length > 0) {
    // Randomly select from available predefined colors
    return availablePredefined[Math.floor(Math.random() * availablePredefined.length)];
  }

  // If all predefined colors are used, generate a distinct color
  return generateDistinctColor(normalizedExisting);
}

// Function to get a color that's guaranteed to be different from existing ones
export function getNextUniqueColor(existingColors: string[]): string {
  return generateUniqueColor(existingColors);
}