// Deterministic color generator from a string
export function stringToColor(input: string, { s = 70, l = 50 }: { s?: number; l?: number } = {}) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  // Limit palette to blue (≈210deg) through red (≈360/0deg)
  const hue = 210 + (Math.abs(hash) % 150); // range [210, 360)
  return `hsl(${hue}, ${s}%, ${l}%)`;
}

export function stringToColorPair(name: string) {
  const base = stringToColor(name, { s: 70, l: 45 });
  const border = stringToColor(name + "|b", { s: 80, l: 30 });
  return { base, border };
}


