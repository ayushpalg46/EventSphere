document.addEventListener('DOMContentLoaded', () => {
  const wishlistBtns = document.querySelectorAll('.wishlist-toggle-btn');
  wishlistBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const eventId = btn.getAttribute('data-event-id');
      
      try {
        const response = await fetch('/user/wishlist/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ eventId })
        });

        if (response.status === 401 || response.redirected) {
          window.location.href = '/login';
          return;
        }

        const data = await response.json();
        if (data.status === 'added') {
          btn.classList.add('active');
          btn.innerHTML = '<i class="fas fa-heart"></i> Wishlisted';
          btn.style.color = '#ff2a5f';
        } else if (data.status === 'removed') {
          btn.classList.remove('active');
          btn.innerHTML = '<i class="far fa-heart"></i> Add to Wishlist';
          btn.style.color = '';
        }
      } catch (err) {
        console.error('Error toggling wishlist:', err);
      }
    });
  });

  const readNotificationsBtn = document.getElementById('mark-notifications-read');
  if (readNotificationsBtn) {
    readNotificationsBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const response = await fetch('/user/notifications/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (data.success) {
          const badge = document.querySelector('.notification-badge');
          if (badge) badge.remove();
          location.reload();
        }
      } catch (err) {
        console.error('Error reading notifications:', err);
      }
    });
  }
});
