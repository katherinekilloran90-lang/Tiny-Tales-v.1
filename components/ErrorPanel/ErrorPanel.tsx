"use client";

import styles from "./ErrorPanel.module.css";

interface ErrorPanelProps {
  /** A safe, user-facing message from the server (never a raw stack trace,
   *  API response, or environment variable name — every error route handler
   *  in this app already guarantees that). Shown as a specific supporting
   *  detail underneath the warm, general reassurance copy. */
  message?: string | null;
  onRetry: () => void;
  onChangeIdea: () => void;
}

/** A friendly, on-brand failure state — replaces dropping the user back on
 *  a blank form with no explanation. */
export function ErrorPanel({ message, onRetry, onChangeIdea }: ErrorPanelProps) {
  return (
    <div className={`${styles.wrapper} animate-in`} role="alert">
      <div className={styles.iconStage} aria-hidden="true">
        <span className={styles.icon}>💫</span>
      </div>

      <h2 className={styles.title}>The magic was interrupted</h2>
      <p className={styles.subtitle}>
        We couldn&apos;t finish your story this time. Nothing has been lost — please try again.
      </p>

      {message && <p className={styles.detail}>{message}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          Try again
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onChangeIdea}>
          Change my idea
        </button>
      </div>
    </div>
  );
}
