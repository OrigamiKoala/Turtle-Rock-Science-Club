import React from 'react';
import { CheckCircle2, ExternalLink, ScrollText } from 'lucide-react';

/**
 * Chemistry Text Adventure
 * ------------------------
 * Not a game we host — it's a choose-your-own-path chemistry story that
 * lives at an external site. There's nothing to simulate here, so unlike
 * the other minigames this has exactly one "level": click through. That
 * click is both the win condition and the only badge this game has.
 */

const ADVENTURE_URL = 'https://origamikoala.github.io/chem-text-adventure/';

interface ChemTextAdventureProps {
  /** Level indices already solved. Only index 0 (the link click) exists. */
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}

export default function ChemTextAdventure({ solvedLevels, onSolve }: ChemTextAdventureProps) {
  const visited = solvedLevels.includes(0);

  return (
    <div className="space-y-5 text-center py-8">
      <ScrollText className="w-10 h-10 text-emerald-400 mx-auto" />

      <div className="space-y-2 max-w-lg mx-auto">
        <h4 className="font-display font-bold text-lg text-white">Chemistry Text Adventure</h4>
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          A choose-your-own-path story where every decision is a chemistry problem. It's hosted on
          its own site, so it opens in a new tab — come back here afterward and the badge is
          already yours.
        </p>
      </div>

      <a
        href={ADVENTURE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onSolve(0)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 cursor-pointer transition"
      >
        Launch the adventure <ExternalLink className="w-3.5 h-3.5" />
      </a>

      {visited && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Adventurer badge unlocked
        </p>
      )}
    </div>
  );
}
