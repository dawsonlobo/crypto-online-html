// DOM access and shared formatting/navigation helpers.
const $ = id => document.getElementById(id);
function showPage(id) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function formatBalance(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 8 });
}
function formatFee(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 18 });
}
function shortAddress(address) {
  if (!address) return "No address added";
  if (address.length < 18) return address;
  return address.slice(0, 9) + "..." + address.slice(-7);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
