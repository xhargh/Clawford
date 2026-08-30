const STORAGE_KEY = "banjo-note-map-state";
const CUSTOM_TUNING_KEY = "banjo-note-map-custom-tuning";

export function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveStoredState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private browsing; the app remains usable.
  }
}

export function loadCustomTuning(isValidTuning = () => true) {
  try {
    const tuning = JSON.parse(localStorage.getItem(CUSTOM_TUNING_KEY));
    return isValidTuning(tuning) ? tuning : null;
  } catch {
    return null;
  }
}

export function saveCustomTuning(tuning) {
  try {
    localStorage.setItem(CUSTOM_TUNING_KEY, JSON.stringify(tuning));
  } catch {
    // A saved custom tuning is optional.
  }
}
