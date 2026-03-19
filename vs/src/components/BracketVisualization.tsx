"use client";

import type { BracketMatch, BracketSide, TournamentBracket } from "@/lib/gameTypes";
import { useEffect, useState } from "react";

interface BracketVisualizationProps {
  bracket: TournamentBracket;
  isHost: boolean;
  onMatchClick: (matchId: string, winner: string) => void;
  disabled?: boolean;
}

const BracketVisualization: React.FC<BracketVisualizationProps> = ({
  bracket,
  isHost,
  onMatchClick,
  disabled = false,
}) => {
  const [animatingMatches, setAnimatingMatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Trigger animations on component mount
    if (!bracket.animationComplete) {
      const allMatchIds = new Set<string>();
      bracket.left.rounds.forEach((round) => {
        round.forEach((match) => {
          allMatchIds.add(match.id);
        });
      });
      bracket.right.rounds.forEach((round) => {
        round.forEach((match) => {
          allMatchIds.add(match.id);
        });
      });
      if (bracket.finals) {
        allMatchIds.add(bracket.finals.id);
      }
      setAnimatingMatches(allMatchIds);
    }
  }, [bracket.animationComplete]);

  const getPhaseColor = () => {
    switch (bracket.currentPhase) {
      case "left":
        return "border-red-500/70";
      case "right":
        return "border-blue-500/70";
      case "finals":
        return "border-yellow-500/70";
      case "finished":
        return "border-green-500/70";
      default:
        return "border-slate-500/50";
    }
  };

  const MatchButton: React.FC<{
    match: BracketMatch;
    isClickable: boolean;
  }> = ({ match, isClickable }) => {
    const handleClick = (winner: string) => {
      if (isClickable && isHost && !disabled) {
        onMatchClick(match.id, winner);
      }
    };

    const animationDelay = animatingMatches.has(match.id)
      ? `calc(var(--stagger-index, 0) * 50ms)`
      : "0ms";

    return (
      <div
        className={`flex flex-col gap-1 min-w-[140px] transition-all duration-500 ${
          animatingMatches.has(match.id)
            ? "animate-fade-in"
            : "opacity-100"
        }`}
        style={{
          animationDelay,
        }}
      >
        <button
          onClick={() => handleClick(match.gameA)}
          disabled={!isClickable}
          className={`rounded border-2 px-2 py-2 text-xs font-semibold text-center truncate transition-all ${
            match.winner === match.gameA
              ? "border-green-500 bg-green-950/50 text-green-300"
              : isClickable
                ? "border-slate-500 bg-slate-800 text-slate-200 hover:border-slate-300 hover:bg-slate-700"
                : "border-slate-600 bg-slate-900/50 text-slate-400 opacity-50"
          }`}
        >
          {match.gameA}
        </button>
        {match.gameB && (
          <>
            <div className="text-[0.625rem] text-slate-500 text-center">vs</div>
            <button
              onClick={() => handleClick(match.gameB!)}
              disabled={!isClickable}
              className={`rounded border-2 px-2 py-2 text-xs font-semibold text-center truncate transition-all ${
                match.winner === match.gameB
                  ? "border-green-500 bg-green-950/50 text-green-300"
                  : isClickable
                    ? "border-slate-500 bg-slate-800 text-slate-200 hover:border-slate-300 hover:bg-slate-700"
                    : "border-slate-600 bg-slate-900/50 text-slate-400 opacity-50"
              }`}
            >
              {match.gameB}
            </button>
          </>
        )}
      </div>
    );
  };

  const SideBracket: React.FC<{ side: BracketSide; label: string }> = ({
    side,
    label,
  }) => {
    return (
      <div className="flex flex-col gap-6">
        <h3 className="text-sm font-bold text-slate-300 text-center">{label}</h3>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {side.rounds.map((round, roundIdx) => (
            <div key={roundIdx} className="flex flex-col gap-2 min-w-fit">
              <p className="text-[0.625rem] text-slate-500 text-center h-4">
                Round {roundIdx + 1}
              </p>
              <div className="flex flex-col gap-4 justify-center min-h-[200px]">
                {round.map((match, matchIdx) => {
                  const hasWinner = match.winner !== null;
                  const isClickable: boolean =
                    !hasWinner &&
                    match.gameA !== "" &&
                    (!match.gameB || match.gameB !== "") &&
                    !side.completed;
                  return (
                    <div key={match.id} style={{ "--stagger-index": matchIdx } as React.CSSProperties}>
                      <MatchButton match={match} isClickable={isClickable} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-lg border-4 p-6 transition-colors ${getPhaseColor()}`}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>

      <div className="space-y-8">
        {/* Left and Right Brackets */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="overflow-x-auto">
            <SideBracket side={bracket.left} label="LEFT BRACKET" />
          </div>
          <div className="overflow-x-auto">
            <SideBracket side={bracket.right} label="RIGHT BRACKET" />
          </div>
        </div>

        {/* Finals */}
        {bracket.finals && (
          <div className="mt-12 flex justify-center border-t border-slate-600 pt-8">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-bold text-slate-300">FINALS</p>
              <div className="flex gap-6">
                <MatchButton
                  match={bracket.finals}
                  isClickable={
                    !bracket.finals.winner &&
                    bracket.finals.gameA !== "" &&
                    bracket.finals.gameB !== null &&
                    bracket.finals.gameB !== "" &&
                    bracket.currentPhase === "finals" &&
                    !disabled
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Victory Message */}
        {bracket.currentPhase === "finished" && bracket.finals?.winner && (
          <div className="mt-8 rounded-lg border border-green-500/50 bg-green-950/30 p-6 text-center">
            <p className="text-sm text-slate-300">Overall Winner</p>
            <p className="text-2xl font-bold text-green-300">
              {bracket.finals.winner}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BracketVisualization;
