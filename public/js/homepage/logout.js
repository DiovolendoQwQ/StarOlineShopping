
export function initLogout() {
    var logoutLink = document.getElementById('logout-link');
    var overlay = document.getElementById('logout-overlay');
    var modal = document.getElementById('logout-modal');
    var cancelBtn = document.getElementById('cancel-logout');
    var confirmBtn = document.getElementById('confirm-logout');

    function showModal() {
        if (!overlay || !modal) return;
        overlay.classList.add('show');
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
    }

    function hideModal() {
        if (!overlay || !modal) return;
        overlay.classList.remove('show');
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    }

    // Use delegation for logout link if it's not found yet (though initLogout should be called after load)
    // But strictly speaking, we should just bind to the element if it exists.
    if (logoutLink) {
        // Remove old listener if any to avoid duplicates? 
        // Cloning node is a cheap way to remove listeners, but risky.
        // We assume initLogout is called once.
        logoutLink.addEventListener('click', function (e) { e.preventDefault(); showModal(); });
    } else {
        // Fallback delegation
        document.body.addEventListener('click', function(e) {
            if (e.target.closest('#logout-link')) {
                e.preventDefault();
                showModal();
            }
        });
    }

    if (overlay) overlay.addEventListener('click', hideModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
    
    // Ensure we don't bind multiple times if initLogout is called multiple times
    if (confirmBtn) {
        // A simple way to ensure single binding is checking a property
        if (!confirmBtn.dataset.bound) {
            confirmBtn.addEventListener('click', async function () {
                try {
                    var resp = await fetch('/auth/logout', { method: 'POST', headers: { 'Accept': 'application/json' } });
                    if (resp.ok) {
                        var data = {}; try { data = await resp.json(); } catch (_) { }
                        var redirect = (data && data.redirect) ? data.redirect : '/login.html';
                        window.location.href = redirect;
                    } else {
                        alert('Logout failed. Please try again later');
                        hideModal();
                    }
                } catch (e) {
                    alert('Network error. Please try again later');
                    hideModal();
                }
            });
            confirmBtn.dataset.bound = "true";
        }
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideModal(); });
    window.LogoutModal = { show: showModal, hide: hideModal };
}
