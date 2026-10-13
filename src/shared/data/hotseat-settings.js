/** Names are plain text, bounded by Unicode code points, with stable blank defaults. */
export default function createHotseatSettings() {
  function normalizeHotseatNames(values) {
    return [0, 1].map(
      (index) =>
        Array.from(
          String(values[index] || '')
            .trim()
            .replace(/\s+/gu, ' '),
        )
          .slice(0, 20)
          .join('') || 'PLAYER ' + (index + 1),
    );
  }
  function validateHotseatNames(values) {
    const names = normalizeHotseatNames(values);
    const invalidIndex = values.findIndex(
      (value) =>
        Array.from(
          String(value || '')
            .trim()
            .replace(/\s+/gu, ' '),
        ).length > 20,
    );
    if (invalidIndex !== -1) {
      return { names, invalidIndex, error: 'Player names must be 20 characters or fewer.' };
    }
    return {
      names,
      error:
        names[0].toLocaleLowerCase() === names[1].toLocaleLowerCase()
          ? 'Please use a different name for each player.'
          : '',
    };
  }
  return { normalizeHotseatNames, validateHotseatNames };
}
