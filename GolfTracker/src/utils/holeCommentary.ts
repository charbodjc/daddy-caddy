/**
 * holeCommentary.ts
 *
 * Generates random, entertaining commentary for hole SMS updates.
 */

const BIRDIE_COMMENTARY = [
  "Birdie alert! Someone's been watching YouTube tutorials!",
  "Under par? Who is this person?!",
  "Birdie! The golf gods are smiling today!",
  "Uh oh, somebody's feeling dangerous!",
  "Birdie! Don't let it go to your head... too late.",
  "Red number! Time to update the handicap!",
  "Birdie! Even a broken clock is right twice a day!",
];

const PAR_COMMENTARY = [
  "Solid par. Nothing fancy, nothing embarrassing.",
  "Par! That's called making a living out here.",
  "Steady Eddie with the par save!",
  "Par. Boring? Maybe. Effective? Absolutely.",
  "Par! The unsung hero of golf scores.",
  "Par the course! ...I'll see myself out.",
  "Par! That's what the pros do. Mostly.",
];

const BOGEY_COMMENTARY = [
  "Bogey. It happens to the best of us (and also to this person).",
  "One over. Let's pretend that didn't happen.",
  "Bogey! The wind was clearly a factor.",
  "Bogey. Blame it on the lie.",
  "One over par. Still better than most of my rounds!",
  "Bogey! The course is fighting back.",
];

const DOUBLE_COMMENTARY = [
  "Double bogey. We don't talk about this one.",
  "That hole owes someone money.",
  "Moving on! Nothing to see here!",
  "Sometimes the course wins. Today it won this hole.",
  "Double. Somewhere a golf ball is crying.",
  "Let's just call that a 'learning experience.'",
];

const EAGLE_COMMENTARY = [
  "EAGLE!!! Is this real life?!",
  "EAGLE! Screenshot this text, it may never happen again!",
  "Two under! Someone call the PGA!",
  "EAGLE! The crowd goes WILD! (It's just us, but still!)",
];

const GENERAL_HYPE = [
  "The tension is REAL right now!",
  "This is getting interesting...",
  "The group chat is LOCKED IN!",
  "Moment of truth!",
  "Here we go!",
  "Big moment on the course!",
  "All eyes on the green!",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate entertaining commentary for a hole update SMS.
 */
export function generateHoleCommentary(
  holeNumber: number,
  par: number,
  strokesSoFar: number,
  _scoreName: string,
): string {
  const scoreVsPar = strokesSoFar - par;
  let commentary: string;

  if (scoreVsPar <= -2) {
    commentary = pickRandom(EAGLE_COMMENTARY);
  } else if (scoreVsPar === -1) {
    commentary = pickRandom(BIRDIE_COMMENTARY);
  } else if (scoreVsPar === 0) {
    commentary = pickRandom(PAR_COMMENTARY);
  } else if (scoreVsPar === 1) {
    commentary = pickRandom(BOGEY_COMMENTARY);
  } else {
    commentary = pickRandom(DOUBLE_COMMENTARY);
  }

  const hype = pickRandom(GENERAL_HYPE);

  return `Hole ${holeNumber} update:\n${commentary}\n${hype}`;
}
