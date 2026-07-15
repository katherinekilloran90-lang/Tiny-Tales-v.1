"use client";

import Image from "next/image";
import styles from "./StorybookReader.module.css";
import type { ImageSlotState } from "./types";

interface ImagePlateProps {
  state: ImageSlotState;
  alt: string;
  onRetry: () => void;
}

/** Renders one illustration slot — fills its parent `.imageWrap` (which owns
 *  the rounded corners, shadow, and aspect ratio): a loading skeleton, the
 *  image itself, or a friendly error with its own retry button (never
 *  restarts the whole book). */
export function ImagePlate({ state, alt, onRetry }: ImagePlateProps) {
  if (state.status === "success" && state.image) {
    return (
      <Image
        src={state.image}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 640px"
        className={styles.image}
        unoptimized
      />
    );
  }

  if (state.status === "error") {
    return (
      <div className={styles.imagePlaceholder}>
        <p className={styles.placeholderText}>This illustration couldn&apos;t be painted.</p>
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          🔁 Retry this illustration
        </button>
      </div>
    );
  }

  return (
    <div className={styles.imagePlaceholder} aria-busy="true">
      <div className={styles.loadingSpinner} aria-hidden="true" />
      <p className={styles.placeholderText}>Painting this illustration…</p>
    </div>
  );
}
