/** Same footprint as the loaded WeeklyChestCard, so the card never shoves the hub when it arrives. */
export function WeeklyChestPlaceholder() {
  return (
    <div
      data-testid="weekly-chest-placeholder"
      aria-hidden="true"
      className="w-full h-[172px] rounded-neo border-2 border-black bg-neo-navy-light shadow-hard skeleton"
    />
  );
}

export default WeeklyChestPlaceholder;
