/**
 * holeCommentary.ts
 *
 * Generates random, non-repeating commentary for hole SMS updates.
 * Each category cycles through all messages before any can repeat.
 */

const BIRDIE_COMMENTARY = [
  "Birdie putt incoming! Someone's been watching YouTube tutorials!",
  "A chance to go under par? Who is this person?!",
  "Putting for birdie! The golf gods are smiling today!",
  "Uh oh, somebody's lining up a birdie putt!",
  "Birdie putt on deck! Don't let the pressure get to you!",
  "A red number is within reach! Time to focus!",
  "Putting for birdie! Even a broken clock is right twice a day!",
];

const PAR_COMMENTARY = [
  "Putting for par. Nothing fancy, nothing embarrassing.",
  "Par putt on the line! That's making a living out here.",
  "Steady Eddie lining up the par putt!",
  "Putting for par. Boring? Maybe. Effective? Absolutely.",
  "Par putt coming up! The unsung hero of golf scores.",
  "Par the course! ...putting for it anyway.",
  "Putting for par! That's what the pros do. Mostly.",
];

const BOGEY_COMMENTARY = [
  "Putting for bogey. It happens to the best of us.",
  "One over if this drops. Let's salvage this!",
  "Bogey putt coming up! The wind was clearly a factor.",
  "Putting for bogey. Blame it on the lie.",
  "One over on the line. Still better than most of my rounds!",
  "Bogey putt! The course is fighting back.",
];

const DOUBLE_COMMENTARY = [
  "Putting for double bogey. We don't talk about this one.",
  "This putt to stop the bleeding. Let's limit the damage!",
  "Time to sink this one and move on!",
  "The course is winning this hole. Time to end it here!",
  "Double bogey putt. Somewhere a golf ball is crying.",
  "Let's just drain this and call it a 'learning experience.'",
];

const EAGLE_COMMENTARY = [
  "EAGLE PUTT!!! Is this real life?!",
  "Putting for EAGLE! Screenshot this text, it may never happen again!",
  "Two under if this drops! Someone call the PGA!",
  "EAGLE PUTT! The crowd is holding its breath! (It's just us, but still!)",
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

/**
 * Shuffle-bag picker: cycles through every item before any repeats.
 * Each array gets its own bag, so "par" commentary and "hype" lines
 * are independently non-repeating.
 */
const usedIndices = new Map<ReadonlyArray<string>, Set<number>>();

function pickWithoutRepeat(arr: ReadonlyArray<string>): string {
  let used = usedIndices.get(arr);
  if (!used || used.size >= arr.length) {
    used = new Set();
    usedIndices.set(arr, used);
  }

  const available = arr
    .map((_, i) => i)
    .filter(i => !used.has(i));

  const idx = available[Math.floor(Math.random() * available.length)];
  used.add(idx);
  return arr[idx];
}

/**
 * Reset all tracking (e.g., when starting a new round).
 */
export function resetCommentaryHistory(): void {
  usedIndices.clear();
}

/**
 * Generate entertaining, non-repeating commentary for a hole update SMS.
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
    commentary = pickWithoutRepeat(EAGLE_COMMENTARY);
  } else if (scoreVsPar === -1) {
    commentary = pickWithoutRepeat(BIRDIE_COMMENTARY);
  } else if (scoreVsPar === 0) {
    commentary = pickWithoutRepeat(PAR_COMMENTARY);
  } else if (scoreVsPar === 1) {
    commentary = pickWithoutRepeat(BOGEY_COMMENTARY);
  } else {
    commentary = pickWithoutRepeat(DOUBLE_COMMENTARY);
  }

  const hype = pickWithoutRepeat(GENERAL_HYPE);

  return `Hole ${holeNumber} live update:\n${commentary}\n${hype}`;
}
