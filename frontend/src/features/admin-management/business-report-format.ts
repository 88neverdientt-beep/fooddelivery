// Business timestamps are wall-clock values from the API, never Date/UTC conversions.
export function reportTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}` : value;
}
