const STAFF_ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" }
];
function formatStaffRoleLabel(role) {
  const match = STAFF_ROLE_OPTIONS.find((opt) => opt.value === role);
  if (match) return match.label;
  return String(role || "Staff").replace(/_/g, " ");
}
function populateStaffRoleSelect(selectEl, { selected = "editor" } = {}) {
  if (!selectEl) return;
  selectEl.innerHTML = STAFF_ROLE_OPTIONS.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("");
  selectEl.value = STAFF_ROLE_OPTIONS.some((opt) => opt.value === selected) ? selected : "editor";
}
export {
  STAFF_ROLE_OPTIONS,
  formatStaffRoleLabel,
  populateStaffRoleSelect
};
