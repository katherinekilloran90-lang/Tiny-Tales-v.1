"use client";

import { FormEvent, useState } from "react";
import { OptionGroup } from "@/components/OptionGroup/OptionGroup";
import {
  DEFAULT_ILLUSTRATION_STYLE,
  DEFAULT_STORY_LENGTH,
  DEFAULT_STORY_STYLE,
  ageRangeOptions,
  ideaSuggestions,
  illustrationStyleOptions,
  storyLengthOptions,
  storyStyleOptions,
} from "./options";
import { IdeaSuggestions } from "./IdeaSuggestions";
import type { StoryFormInput } from "@/lib/types";
import styles from "./StoryForm.module.css";

const IDEA_MAX_LENGTH = 300;
const NAME_MAX_LENGTH = 30;

interface StoryFormProps {
  onSubmit: (input: StoryFormInput) => void;
  disabled?: boolean;
  initialError?: string | null;
  /** Repopulates the form — used when returning from an error via "Change my
   *  idea", so the parent/child don't have to retype everything. */
  initialValues?: Partial<StoryFormInput>;
}

export function StoryForm({ onSubmit, disabled, initialError, initialValues }: StoryFormProps) {
  const [idea, setIdea] = useState(initialValues?.idea ?? "");
  const [childName, setChildName] = useState(initialValues?.childName ?? "");
  const [ageRange, setAgeRange] = useState<StoryFormInput["ageRange"]>(
    initialValues?.ageRange ?? "6-8"
  );

  // These three still power the story pipeline exactly as before, but they're
  // no longer part of the primary 3-question flow. They default to values
  // that suit a bright, modern storybook, and can be tweaked in "Customize
  // the magic" below without touching the API or prompt logic.
  const [storyStyle, setStoryStyle] = useState<StoryFormInput["storyStyle"]>(
    initialValues?.storyStyle ?? DEFAULT_STORY_STYLE
  );
  const [illustrationStyle, setIllustrationStyle] = useState<StoryFormInput["illustrationStyle"]>(
    initialValues?.illustrationStyle ?? DEFAULT_ILLUSTRATION_STYLE
  );
  const [storyLength, setStoryLength] = useState<StoryFormInput["storyLength"]>(
    initialValues?.storyLength ?? DEFAULT_STORY_LENGTH
  );

  const [showCustomize, setShowCustomize] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // A local, instant guard against double-taps: the parent also unmounts
  // this form while generating, but that transition depends on state
  // propagating back up, so this flips the button off on the very first
  // click with no delay.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = disabled || isSubmitting;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isDisabled) return;

    const trimmedIdea = idea.trim();
    if (trimmedIdea.length < 3) {
      setFormError("Tell us a little more about your story idea.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    onSubmit({
      idea: trimmedIdea,
      childName: childName.trim() || undefined,
      ageRange,
      storyStyle,
      illustrationStyle,
      storyLength,
    });
  }

  const activeError = formError || initialError;

  return (
    <form className={`${styles.card} animate-in`} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="childName" className={styles.label}>
          <span className={styles.labelIcon} aria-hidden="true">
            👋
          </span>
          What&apos;s your child&apos;s name?
          <span className={styles.optional}>(optional)</span>
        </label>
        <input
          id="childName"
          type="text"
          className={styles.input}
          value={childName}
          onChange={(e) => setChildName(e.target.value.slice(0, NAME_MAX_LENGTH))}
          maxLength={NAME_MAX_LENGTH}
          placeholder="e.g. Amara"
          disabled={isDisabled}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>
          <span className={styles.labelIcon} aria-hidden="true">
            🎂
          </span>
          How old are they?
        </span>
        <OptionGroup
          legend="Child's age"
          name="ageRange"
          options={ageRangeOptions}
          value={ageRange}
          onChange={setAgeRange}
          columns={3}
          hideLegend
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="idea" className={styles.label}>
          <span className={styles.labelIcon} aria-hidden="true">
            🪄
          </span>
          What adventure should we create?
        </label>
        <textarea
          id="idea"
          className={styles.textarea}
          value={idea}
          onChange={(e) => setIdea(e.target.value.slice(0, IDEA_MAX_LENGTH))}
          maxLength={IDEA_MAX_LENGTH}
          rows={3}
          placeholder="A little dragon who is afraid of the dark…"
          required
          aria-describedby="idea-count"
          disabled={isDisabled}
        />
        <span id="idea-count" className={styles.charCount}>
          {idea.length}/{IDEA_MAX_LENGTH}
        </span>

        <IdeaSuggestions
          suggestions={ideaSuggestions}
          currentIdea={idea}
          onSelect={(prompt) => setIdea(prompt)}
          disabled={isDisabled}
        />
      </div>

      {activeError && (
        <p className={styles.error} role="alert">
          {activeError}
        </p>
      )}

      <div className={styles.ctaGroup}>
        <button type="submit" className={styles.submit} disabled={isDisabled}>
          {isSubmitting ? "Creating your story…" : "Create my story ✨"}
        </button>
        <p className={styles.reassurance}>
          Your story and illustrations are created especially for you.
        </p>
      </div>

      <button
        type="button"
        className={styles.customizeToggle}
        onClick={() => setShowCustomize((v) => !v)}
        aria-expanded={showCustomize}
        aria-controls="customize-panel"
      >
        🎨 Customize the magic
        <span className={`${styles.chevron} ${showCustomize ? styles.chevronOpen : ""}`}>⌄</span>
      </button>

      {showCustomize && (
        <div id="customize-panel" className={`${styles.customizePanel} animate-in`}>
          <OptionGroup
            legend="Story style"
            name="storyStyle"
            options={storyStyleOptions}
            value={storyStyle}
            onChange={setStoryStyle}
            columns={5}
          />
          <OptionGroup
            legend="Illustration style"
            name="illustrationStyle"
            options={illustrationStyleOptions}
            value={illustrationStyle}
            onChange={setIllustrationStyle}
            columns={4}
          />
          <OptionGroup
            legend="Story length"
            name="storyLength"
            options={storyLengthOptions}
            value={storyLength}
            onChange={setStoryLength}
            columns={2}
          />
        </div>
      )}
    </form>
  );
}
