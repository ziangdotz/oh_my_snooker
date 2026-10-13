/** Persist setup only; reloading never resumes scores or starts a match automatically. */
export default function createHotseatSession(host) {
  const key = 'oh-my-snooker:hotseat-draft';
  let stored = null;
  try {
    const value = JSON.parse(host.sessionStorage.getItem(key));
    if (
      value?.version === 1 &&
      value.mode === 'hotseat' &&
      ['setup', 'overview'].includes(value.returnTo) &&
      /^interior-design-(original|00[1-3])$/u.test(value.venue) &&
      Array.isArray(value.names) &&
      value.names.length === 2 &&
      value.names.every((name) => typeof name === 'string' && Array.from(name).length <= 80)
    ) {
      stored = value;
    }
  } catch {
    // Private browsing and disabled storage still support an in-memory match.
  }
  return {
    config: null,
    draft: stored ? { names: [...stored.names], venue: stored.venue } : null,
    returnToSetup: stored?.returnTo === 'setup',
    saveDraft(draft, returnTo = 'setup') {
      this.draft = draft;
      try {
        host.sessionStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            mode: 'hotseat',
            names: draft.names.map((name) => Array.from(name).slice(0, 80).join('')),
            venue: draft.venue,
            returnTo,
          }),
        );
      } catch {
        // The live drawer owns the draft even when storage is unavailable.
      }
    },
  };
}
