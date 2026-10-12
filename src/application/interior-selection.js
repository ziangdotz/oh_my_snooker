/** Room selection policy is independent of DOM, storage and navigation. */
export default function createInteriorDesignSelection(registry) {
  return {
    choose(href, currentId, targetId) {
      const design = registry.get(targetId);
      if (!design) {
        throw new Error('Unknown interior design: ' + targetId);
      }
      if (targetId === currentId) {
        return null;
      }
      const url = new URL(href);
      url.searchParams.set('interior', targetId);
      url.searchParams.delete('wall-study');
      return { id: design.id, name: design.displayName, href: url.href };
    },
  };
}
