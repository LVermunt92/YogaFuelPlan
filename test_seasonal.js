// Quick test to show seasonal differences
const months = [
  { month: 1, name: 'January' },
  { month: 4, name: 'April' }, 
  { month: 7, name: 'July' },
  { month: 10, name: 'October' }
];

function getCurrentAyurvedicSeason(month) {
  if (month >= 12 || month <= 1) return 'shishira'; // Late Winter (Dec-Jan)
  if (month >= 2 && month <= 3) return 'vasanta';   // Spring (Feb-Mar)
  if (month >= 4 && month <= 5) return 'grishma';   // Early Summer (Apr-May)
  if (month >= 6 && month <= 7) return 'varsha';    // Monsoon (Jun-Jul)
  if (month >= 8 && month <= 9) return 'sharad';    // Autumn (Aug-Sep)
  if (month >= 10 && month <= 11) return 'hemanta'; // Early Winter (Oct-Nov)
  
  return 'vasanta';
}

const guidance = {
  shishira: { qualities: ['cold', 'dry'], spices: ['ginger', 'cinnamon', 'cardamom'] },
  vasanta: { qualities: ['cool', 'wet'], spices: ['turmeric', 'coriander', 'fennel'] },
  grishma: { qualities: ['warm', 'dry'], spices: ['coriander', 'fennel', 'mint'] },
  varsha: { qualities: ['humid', 'variable'], spices: ['ginger', 'cumin', 'black pepper'] },
  sharad: { qualities: ['dry', 'cool'], spices: ['turmeric', 'coriander', 'fennel'] },
  hemanta: { qualities: ['cool', 'dry'], spices: ['ginger', 'cinnamon', 'cardamom'] }
};

console.log('Ayurvedic Seasonal System:');
console.log('=========================');
months.forEach(({month, name}) => {
  const season = getCurrentAyurvedicSeason(month);
  const info = guidance[season];
  console.log(`${name} (Month ${month}): ${season} season`);
  console.log(`  Qualities: ${info.qualities.join(', ')}`);
  console.log(`  Key spices: ${info.spices.join(', ')}\n`);
});
