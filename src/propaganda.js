// Official Bureau of Guy Conduct propaganda lines. One is displayed at a
// time; the footer rotates through them.
export const PROPAGANDA = [
  'Your conduct has been noted.',
  'Snitching is encouraged, comrade.',
  'A flake today is a pariah tomorrow.',
  'The Bureau sees your "on my way".',
  'Loyalty is measured in credit points.',
  'Report your friends. It is what they would want.',
  'Obedience brings snacks. Snacks bring honor.',
  'The aux cord belongs to the worthy.',
  'Denial of the bill split is denial of the Guys.',
  'Big score energy is earned, never given.',
  'Celebrate responsibly. The Bureau is watching the group chat.',
  'Helping a guy move: the highest form of devotion.',
];

export function randomSlogan(exclude) {
  if (PROPAGANDA.length < 2) return PROPAGANDA[0];
  let pick = PROPAGANDA[Math.floor(Math.random() * PROPAGANDA.length)];
  while (pick === exclude) {
    pick = PROPAGANDA[Math.floor(Math.random() * PROPAGANDA.length)];
  }
  return pick;
}
