/** Format linked stations row (location + room_number) for student/instructor UI */
export function formatExamStation(station, fallbackRoomName = '') {
  if (!station) {
    const fb = (fallbackRoomName || '').trim();
    return fb || '—';
  }
  const place = (station.location || station.name || '').trim();
  const room = (station.room_number || '').trim();
  if (place && room) return `${place} · Room ${room}`;
  if (place) return place;
  if (room) return `Room ${room}`;
  const fb = (fallbackRoomName || '').trim();
  return fb || '—';
}
