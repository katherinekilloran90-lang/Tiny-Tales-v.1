"use client";

import { useState } from "react";
import { StoryForm } from "@/components/StoryForm/StoryForm";
import { ProgressExperience } from "@/components/ProgressExperience/ProgressExperience";
import { StorybookReader } from "@/components/StorybookReader/StorybookReader";
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

type Step = "form" | "generating" | "reading";

export default function Home() {
  const [step, setStep] = useState<Step>("form");
  const [progressIndex, setProgressIndex] = useState(0);
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [images, setImages] = useState<ImageSlotMap>({});
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setStep("generating");
    setProgressIndex(0);

    let generatedStory: StoryResponse;
    try {
      generatedStory = await postJson<StoryResponse>("/api/story", input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("form");
      return;
    }

    setStory(generatedStory);
    setProgressIndex(1);

    const targets: ImageTarget[] = ["cover", ...generatedStory.pages.map((p) => p.pageNumber)];
    const initialImages: ImageSlotMap = {};
    for (const target of targets) {
      initialImages[slotKey(target)] = { status: "loading" };
    }
    setImages(initialImages);
    setProgressIndex(2);

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
    setStep("form");
  }

  return (
    <main className={styles.main}>
      {step !== "reading" && (
        <header className={`${styles.hero} animate-in`}>
          <p className={styles.eyebrow}>✨ Tiny Tales</p>
          <h1 className={styles.brand}>Every bedtime begins with an idea.</h1>
        </header>
      )}

      {step === "form" && (
        <StoryForm onSubmit={handleSubmit} initialError={error} />
      )}

      {step === "generating" && <ProgressExperience activeStep={progressIndex} />}

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
