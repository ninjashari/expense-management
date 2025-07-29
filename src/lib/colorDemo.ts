import { generateUniqueColor } from './colorGenerator';

// Demo function to show how the color generation works
export function demonstrateColorGeneration() {
  const existingColors: string[] = [];
  const generatedColors: string[] = [];

  console.log('🎨 Color Generation Demo');
  console.log('========================');

  // Generate 15 unique colors
  for (let i = 0; i < 15; i++) {
    const newColor = generateUniqueColor(existingColors);
    existingColors.push(newColor);
    generatedColors.push(newColor);
    
    console.log(`Color ${i + 1}: ${newColor}`);
  }

  console.log('\n📊 Statistics:');
  console.log(`Total colors generated: ${generatedColors.length}`);
  console.log(`All colors unique: ${new Set(generatedColors).size === generatedColors.length}`);
  
  return generatedColors;
}

// You can call this in the browser console to see the demo
if (typeof window !== 'undefined') {
  (window as unknown as { demonstrateColorGeneration: typeof demonstrateColorGeneration }).demonstrateColorGeneration = demonstrateColorGeneration;
}