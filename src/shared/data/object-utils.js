/** Data operations retain the game's merge, clone and duration conventions. */
export default function objectUtils(module) {
  const primitiveTypes = { number: true, string: true, boolean: true, undefined: true };
  const utils = Object.assign(Object.create(null), {
    deepClone(value) {
      if (primitiveTypes[typeof value] || value === null) {
        return value;
      }
      if (Array.isArray(value)) {
        const copy = [];
        for (let index = 0; index < value.length; index++) {
          copy[index] = utils.deepClone(value[index]);
        }
        return copy;
      }
      if (typeof value === 'object') {
        const copy = {};
        for (const key in value) {
          copy[key] = utils.deepClone(value[key]);
        }
        return copy;
      }
    },
    politeMerge(target, key, value) {
      const type = typeof value;
      if (!primitiveTypes[type] && value !== null && !Array.isArray(value) && key in target) {
        if (type === 'object') {
          for (const child in value) {
            utils.politeMerge(target[key], child, value[child]);
          }
        }
      } else {
        target[key] = value;
      }
    },
    toTimeString(seconds) {
      if (seconds <= 0) {
        return '00:00:00';
      }
      const second = Math.floor(seconds % 60);
      let remaining = seconds / 60;
      const minute = Math.floor(remaining % 60);
      remaining /= 60;
      const hour = Math.floor(remaining % 60);
      const pad = (value) => (value > 9 ? String(value) : '0' + value);
      return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
    },
  });
  module.exports = utils;
}
