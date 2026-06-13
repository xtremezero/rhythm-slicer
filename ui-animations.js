// --- UI ANIMATIONS ---
function animateElement(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('animate-pop');
    void el.offsetWidth; // trigger reflow
    el.classList.add('animate-pop');
}