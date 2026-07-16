"use client";

import { useState } from "react";
import { StoryForm } from "@/components/StoryForm/StoryForm";
import { ProgressExperience } from "@/components/ProgressExperience/ProgressExperience";
import { StorybookReader } from "@/components/StorybookReader/StorybookReader";
import { ErrorPanel } from "@/components/ErrorPanel/ErrorPanel";
import { slotKey } from "@/components/StorybookReader/types";
import type { ImageSlotMap } from "@/components/StorybookReader/types";
import { postJson } from "@/lib/api";
import type {
  ImageRequestBody,
  ImageResponseBody,
  ImageTarget,
  StoryFormInput,
  StoryResponse,
} from "@/lib/types";
import styles from "./page.module.css";

type Step = "form" | "generating" | "reading" | "error";

// Purely a perceived-progress nudge: the real /api/story call has no
// intermediate progress events, so this just moves the loading screen from
// "dreaming up characters" to "writing the adventure" partway through that
// single request, so it never looks frozen during a call that can take
// 10-20+ seconds. It never marks anything as *complete* — only the actual
// API response (below) does that.
const WRITING_STAGE_NUDGE_MS = 3500;

export default function Home() {
  const [step, setStep] = useState<Step>("form");
  const [progressIndex, setProgressIndex] = useState(0);
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [images, setImages] = useState<ImageSlotMap>({});
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<StoryFormInput | null>(null);

  async function fetchImage(storyId: string, target: ImageTarget) {
    const key = slotKey(target);
    setImages((prev) => ({ ...prev, [key]: { status: "loading" } }));
    try {
      const body: ImageRequestBody = { storyId, target };
      const result = await postJson<ImageResponseBody>("/api/image", body);
      setImages((prev) => ({ ...prev, [key]: { status: "success", image: result.image } }));
    } catch {
      setImages((prev) => ({ ...prev, [key]: { status: "error" } }));
    }
  }

  async function handleSubmit(input: StoryFormInput) {
    setLastInput(input);
    setError(null);
    setStep("generating");
    setProgressIndex(0);

    const writingNudge = setTimeout(() => setProgressIndex(1), WRITING_STAGE_NUDGE_MS);

    let generatedStory: StoryResponse;
    try {
      generatedStory = await postJson<StoryResponse>("/api/story", input);
    } catch (err) {
      clearTimeout(writingNudge);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("error");
      return;
    }
    clearTimeout(writingNudge);

    setStory(generatedStory);
    setProgressIndex(2);

    const targets: ImageTarget[] = ["cover", ...generatedStory.pages.map((p) => p.pageNumber)];
    const initialImages: ImageSlotMap = {};
    for (const target of targets) {
      initialImages[slotKey(target)] = { status: "loading" };
    }
    setImages(initialImages);

    await Promise.allSettled(targets.map((target) => fetchImage(generatedStory.storyId, target)));

    setProgressIndex(3);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setStep("reading");
  }

  function handleRegenerate(target: ImageTarget) {
    if (!story) return;
    void fetchImage(story.storyId, target);
  }

  function handleCreateAnother() {
    setStory(null);
    setImages({});
    setError(null);
    setLastInput(null);
    setStep("form");
  }

  function handleRetry() {
    if (lastInput) void handleSubmit(lastInput);
  }

  function handleChangeIdea() {
    setError(null);
    setStep("form");
  }

  const totalImages = story ? story.pages.length + 1 : 0;
  const readyImages = Object.values(images).filter((i) => i.status === "success").length;
  const progressDetail =
    step === "generating" && progressIndex >= 2 && totalImages > 0
      ? `${readyImages} of ${totalImages} illustrations ready`
      : undefined;

  return (
    <main className={styles.main}>
      {step !== "reading" && (
        <header className={`${styles.hero} animate-in`}>
          <p className={styles.eyebrow}>✨ Tiny Tales</p>
          <h1 className={styles.brand}>Every bedtime begins with an idea.</h1>
        </header>
      )}

      {step === "form" && (
        <StoryForm onSubmit={handleSubmit} initialError={error} initialValues={lastInput ?? undefined} />
      )}

      {step === "generating" && (
        <ProgressExperience activeStep={progressIndex} detail={progressDetail} />
      )}

      {step === "error" && (
        <ErrorPanel message={error} onRetry={handleRetry} onChangeIdea={handleChangeIdea} />
      )}

      {step === "reading" && story && (
        <StorybookReader
          story={story}
          images={images}
          onRegenerate={handleRegenerate}
          onCreateAnother={handleCreateAnother}
        />
      )}
    </main>
  );
}
