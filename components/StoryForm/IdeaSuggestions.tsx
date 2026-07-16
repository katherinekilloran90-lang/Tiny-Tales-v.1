"use client";

import type { IdeaSuggestion } from "./options";
import styles from "./IdeaSuggestions.module.css";

interface IdeaSuggestionsProps {
  suggestions: IdeaSuggestion[];
  currentIdea: string;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * A row of large, colourful, tappable inspiration chips. These are pure
 * inspiration, not a form control tied to validation — picking one just
 * fills the idea textarea with a starter prompt that the parent or child
 * can still freely edit afterwards.
 */
export function IdeaSuggestions({
  suggestions,
  currentIdea,
  onSelect,
  disabled,
}: IdeaSuggestionsProps) {
  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>Need a little inspiration?</p>
      <div className={styles.chipRow} role="group" aria-label="Story idea suggestions">
        {suggestions.map((suggestion) => {
          const isActive = currentIdea.trim() === suggestion.prompt;
          return (
            <button
              key={suggestion.label}
              type="button"
              className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
              onClick={() => onSelect(suggestion.prompt)}
              disabled={disabled}
              aria-pressed={isActive}
            >
              <span className={styles.chipEmoji} aria-hidden="true">
                {suggestion.emoji}
              </span>
              <span>{suggestion.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
