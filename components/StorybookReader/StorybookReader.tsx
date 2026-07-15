"use client";

import { useEffect, useRef, useState } from "react";
import type { ImageTarget, StoryResponse } from "@/lib/types";
import { ImagePlate } from "./ImagePlate";
import { slotKey } from "./types";
import type { ImageSlotMap } from "./types";
import styles from "./StorybookReader.module.css";

interface StorybookReaderProps {
  story: StoryResponse;
  images: ImageSlotMap;
  onRegenerate: (target: ImageTarget) => void;
  onCreateAnother: () => void;
}

/** index 0 = cover, index 1..N = story pages */
export function StorybookReader({
  story,
  images,
  onRegenerate,
  onCreateAnother,
}: StorybookReaderProps) {
  const totalScreens = story.pages.length + 1;
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(totalScreens - 1, next)));
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, totalScreens]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    const SWIPE_THRESHOLD = 50;
    if (delta > SWIPE_THRESHOLD) goTo(index - 1);
    else if (delta < -SWIPE_THRESHOLD) goTo(index + 1);
    touchStartX.current = null;
  }

  const isCover = index === 0;
  const currentPage = isCover ? null : story.pages[index - 1] ?? null;
  const currentTarget: ImageTarget = currentPage ? currentPage.pageNumber : "cover";
  const currentImage = images[slotKey(currentTarget)] ?? { status: "loading" as const };

  return (
    <section className={`${styles.reader} animate-in`} aria-label={`${story.title} storybook`}>
      <div
        className={styles.stage}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div key={index} className={`${styles.page} animate-in`}>
          <div className={styles.imageWrap}>
            <ImagePlate
              state={currentImage}
              alt={
                isCover
                  ? `Cover illustration for ${story.title}`
                  : `Illustration for page ${currentTarget} of ${story.title}`
              }
              onRetry={() => onRegenerate(currentTarget)}
            />

            {currentImage.status === "success" && (
              <button
                type="button"
                className={styles.regenerateFab}
                onClick={() => onRegenerate(currentTarget)}
                aria-label="Regenerate this illustration"
                title="Regenerate this illustration"
              >
                🎨
              </button>
            )}

            <button
              type="button"
              className={`${styles.navFab} ${styles.navFabLeft}`}
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous page"
            >
              ←
            </button>
            <button
              type="button"
              className={`${styles.navFab} ${styles.navFabRight}`}
              onClick={() => goTo(index + 1)}
              disabled={index === totalScreens - 1}
              aria-label="Next page"
            >
              →
            </button>
          </div>

          <div className={styles.textPanel}>
            {isCover ? (
              <>
                <h1 className={styles.title}>{story.title}</h1>
                <p className={styles.subtitle}>{story.subtitle}</p>
              </>
            ) : (
              <p className={styles.pageText}>{currentPage?.text}</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.dots} aria-hidden="true">
          {Array.from({ length: totalScreens }).map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === index ? styles.dotActive : ""}`} />
          ))}
        </div>
        <span className="visually-hidden" aria-live="polite">
          {isCover ? "Cover" : `Page ${currentTarget} of ${story.pages.length}`}
        </span>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.createAnotherButton} onClick={onCreateAnother}>
          Create Another Story
        </button>
      </div>
    </section>
  );
}
