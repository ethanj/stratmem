/**
 * Query-string defaults for the sender/receiver prototype page.
 *
 * The live demo can open `/ ?role=sender&room=0000` so operators do not need
 * to set the room by hand while rehearsing.
 */
export function applyUrlDefaults(ui) {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  const room = params.get("room");
  const s2 = params.get("s2");

  if (role === "sender" || role === "receiver") {
    ui.roleSelect.value = role;
  }
  if (room) {
    ui.roomInput.value = room;
  }
  if (s2 && ui.s2EndpointInput) {
    ui.s2EndpointInput.value = s2;
  }
}
