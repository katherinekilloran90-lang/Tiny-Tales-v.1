"use client";

import styles from "./ProgressExperience.module.css";

export const PROGRESS_STEPS = [
  { icon: "✨", label: "Dreaming up characters..." },
  { icon: "📖", label: "Writing your magical adventure..." },
  { icon: "🎨", label: "Painting beautiful illustrations..." },
  { icon: "📚", label: "Binding your storybook..." },
] as const;

interface ProgressExperienceProps {
  activeStep: number; // 0-based index into PROGRESS_STEPS
}

export function ProgressExperience({ activeStep }: ProgressExperienceProps) {
  const clampedStep = Math.min(Math.max(activeStep, 0), PROGRESS_STEPS.length - 1);
  const current = PROGRESS_STEPS[clampedStep] ?? PROGRESS_STEPS[0];
  const progressPercent = ((clampedStep + 1) / PROGRESS_STEPS.length) * 100;

  return (
    <div className={`${styles.wrapper} animate-in`} role="status" aria-live="polite">
      <div className={styles.iconStage}>
        <span key={clampedStep} className={styles.bigIcon}>
          {current.icon}
        </span>
      </div>

      <p key={`label-${clampedStep}`} className={`${styles.currentLabel} animate-in`}>
        {current.label}
      </p>

      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progressPercent}%` }} />
      </div>

      <div className={styles.dots}>
        {PROGRESS_STEPS.map((step, index) => (
          <span
            key={step.label}
            className={`${styles.dot} ${index <= clampedStep ? styles.dotActive : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
