
export const timeAgo = (timestamp: string): string => {
  const now = new Date();
  const past = new Date(timestamp);
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const elapsed = now.getTime() - past.getTime();

  if (elapsed < msPerMinute) {
    return Math.round(elapsed / 1000) + 's';
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + 'm';
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + 'h';
  } else if (elapsed < msPerDay * 7) {
    return Math.round(elapsed / msPerDay) + 'd';
  } else {
    return past.toLocaleDateString();
  }
};


export const formatTimestamp = (timestamp: string) => {
  // TODO: Implement actual time formatting
  return timestamp;
};
