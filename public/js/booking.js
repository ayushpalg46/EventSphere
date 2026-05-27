document.addEventListener('DOMContentLoaded', () => {
  const qtyInputs = document.querySelectorAll('.ticket-qty-input');
  const subtotalDisplay = document.getElementById('calc-subtotal');
  const discountDisplay = document.getElementById('calc-discount');
  const totalDisplay = document.getElementById('calc-total');
  const discountCodeInput = document.getElementById('promo-code-input');
  const applyPromoBtn = document.getElementById('apply-promo-btn');
  const promoMessage = document.getElementById('promo-message');

  function calculateTotals() {
    let subtotal = 0;
    let totalDiscount = 0;

    qtyInputs.forEach(input => {
      const qty = parseInt(input.value) || 0;
      const price = parseFloat(input.getAttribute('data-price')) || 0;
      const discountPercent = parseInt(input.getAttribute('data-discount-percent')) || 0;
      const discountCode = input.getAttribute('data-discount-code') || '';
      
      const itemTotal = price * qty;
      subtotal += itemTotal;

      const enteredCode = discountCodeInput ? discountCodeInput.value.trim().toUpperCase() : '';
      if (enteredCode && discountCode.toUpperCase() === enteredCode) {
        const itemDiscount = (itemTotal * discountPercent) / 100;
        totalDiscount += itemDiscount;
      }
    });

    const finalTotal = subtotal - totalDiscount;

    if (subtotalDisplay) subtotalDisplay.textContent = `Rs. ${subtotal.toFixed(2)}`;
    if (discountDisplay) discountDisplay.textContent = `Rs. ${totalDiscount.toFixed(2)}`;
    if (totalDisplay) totalDisplay.textContent = `Rs. ${finalTotal.toFixed(2)}`;
  }

  function updatePromoMessage(isButtonClick = false) {
    const enteredCode = discountCodeInput ? discountCodeInput.value.trim().toUpperCase() : '';
    if (!enteredCode) {
      if (promoMessage) promoMessage.style.display = 'none';
      return;
    }

    let codeExists = false;
    let matchedInput = null;

    qtyInputs.forEach(input => {
      const ticketCode = input.getAttribute('data-discount-code') || '';
      if (ticketCode && ticketCode.toUpperCase() === enteredCode) {
        codeExists = true;
        matchedInput = input;
      }
    });

    if (!codeExists) {
      showPromoMessage('Invalid coupon code.', '#ef4444');
    } else {
      const discountPercent = parseInt(matchedInput.getAttribute('data-discount-percent')) || 0;
      const ticketRow = matchedInput.closest('.ticket-select-row');
      const ticketName = ticketRow ? ticketRow.querySelector('h3').textContent : 'this tier';
      
      let qty = parseInt(matchedInput.value) || 0;
      let totalQty = 0;
      qtyInputs.forEach(input => {
        totalQty += parseInt(input.value) || 0;
      });

      if (isButtonClick && qty === 0 && totalQty === 0) {
        matchedInput.value = 1;
        qty = 1;
        calculateTotals();
      }

      if (qty > 0) {
        showPromoMessage(`Coupon applied! ${discountPercent}% discount active for ${ticketName}.`, '#10b981');
      } else {
        showPromoMessage(`Coupon is valid! Select tickets for ${ticketName} to apply the discount.`, '#f59e0b');
      }
    }
  }

  function showPromoMessage(msg, color) {
    if (promoMessage) {
      promoMessage.textContent = msg;
      promoMessage.style.color = color;
      promoMessage.style.display = 'block';
    }
  }

  qtyInputs.forEach(input => {
    input.addEventListener('change', () => {
      if (parseInt(input.value) < 0) input.value = 0;
      calculateTotals();
      updatePromoMessage(false);
    });
  });

  if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      updatePromoMessage(true);
      calculateTotals();
    });
  }

  if (discountCodeInput) {
    discountCodeInput.addEventListener('input', () => {
      updatePromoMessage(false);
      calculateTotals();
    });
  }

  calculateTotals();
});
