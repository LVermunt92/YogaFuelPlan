// Test European seasonal detection
function getCurrentAyurvedicSeason(month, location = 'europe') {
  if (location === 'europe') {
    // European/Netherlands climate adaptation
    if (month >= 12 || month <= 2) return 'shishira'; // Winter (Dec-Feb)
    if (month >= 3 && month <= 5) return 'vasanta';   // Spring (Mar-May)
    if (month >= 6 && month <= 8) return 'grishma';   // Summer (Jun-Aug)
    if (month >= 9 && month <= 11) return 'sharad';   // Autumn (Sep-Nov)
    return 'vasanta'; // default to spring
  } else {
    // Traditional Indian Ayurvedic calendar
    if (month >= 12 || month <= 1) return 'shishira'; // Late Winter (Dec-Jan)
    if (month >= 2 && month <= 3) return 'vasanta';   // Spring (Feb-Mar)
    if (month >= 4 && month <= 5) return 'grishma';   // Early Summer (Apr-May)
    if (month >= 6 && month <= 7) return 'varsha';    // Monsoon (Jun-Jul)
    if (month >= 8 && month <= 9) return 'sharad';    // Autumn (Aug-Sep)
    if (month >= 10 && month <= 11) return 'hemanta'; // Early Winter (Oct-Nov)
    return 'vasanta'; // default to spring
  }
}

console.log('Testing seasonal detection for July (month 7):');
console.log('Indian setting:', getCurrentAyurvedicSeason(7, 'india'));
console.log('European setting:', getCurrentAyurvedicSeason(7, 'europe'));

console.log('\nYearly overview for Europe:');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
months.forEach((month, index) => {
  const monthNum = index + 1;
  const season = getCurrentAyurvedicSeason(monthNum, 'europe');
  console.log(`${month} (${monthNum}): ${season}`);
});
