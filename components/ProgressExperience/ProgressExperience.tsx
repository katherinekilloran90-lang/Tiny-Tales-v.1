"use client";

import styles from "./ProgressExperience.module.css";

export const PROGRESS_STEPS = [
  { icon: "✨", label: "Dreaming up the characters" },
  { icon: "📖", label: "Writing the adventure" },
  { icon: "🎨", label: "Painting the illustrations" },
  { icon: "📚", label: "Binding the storybook" },
] as const;

interface ProgressExperienceProps {
  activeStep: number; // 0-based index into PROGRESS_STEPS
  /** Optional, real (never faked) sub-detail shown under the current stage —
   *  e.g. "3 of 5 illustrations ready" once some images have actually come back. */
  detail?: string;
}

export function ProgressExperience({ activeStep, detail }: ProgressExperienceProps) {
  const clampedStep = Math.min(Math.max(activeStep, 0), PROGRESS_STEPS.length - 1);
  const current = PROGRESS_STEPS[clampedStep] ?? PROGRESS_STEPS[0];
  const progressPercent = ((clampedStep + 1) / PROGRESS_STEPS.length) * 100;

  return (
    <div className={`${styles.wrapper} animate-in`} role="status" aria-live="polite">
      <div className={styles.iconStage}>
        <span className={styles.star1} aria-hidden="true">
          ✦
        </span>
        <span className={styles.star2} aria-hidden="true">
          ✦
        </span>
        <span className={styles.star3} aria-hidden="true">
          ✦
        </span>
        <span key={clampedStep} className={styles.bigIcon}>
          {current.icon}
        </span>
      </div>

      <p key={`label-${clampedStep}`} className={`${styles.currentLabel} animate-in`}>
        {current.label}
      </p>

      {detail && (
        <p className={styles.detail} aria-live="polite">
          {detail}
        </p>
      )}

      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progressPercent}%` }} />
      </div>

      <ol className={styles.stageList}>
        {PROGRESS_STEPS.map((step, index) => {
          const state = index < clampedStep ? "done" : index === clampedStep ? "active" : "upcoming";
          return (
            <li key={step.label} className={`${styles.stageItem} ${styles[state]}`}>
              <span className={styles.stageMarker} aria-hidden="true">
                {state === "done" ? "✓" : step.icon}
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>

      <div className={styles.reassurance}>
        <p>This usually takes around a minute.</p>
        <p>Please keep this page open while we make your story.</p>
      </div>
    </div>
  );
}
