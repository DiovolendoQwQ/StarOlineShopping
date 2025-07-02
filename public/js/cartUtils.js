document.addEventListener('DOMContentLoaded', () => {
  const addToCartButtons = document.querySelectorAll('.add-to-cart');

  if (addToCartButtons.length > 0) {
    addToCartButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const productId = button.dataset.productId;
        const productName = button.dataset.productName;
        const productPrice = button.dataset.productPrice;

        try {
          const response = await fetch('/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              name: productName,
              price: parseFloat(productPrice),
              quantity: 1
            })
          });

          if (response.ok) {
            alert(`${productName} 已成功加入购物车！`);
          } else {
            const error = await response.json();
            alert(`添加失败: ${error.message}`);
          }
        } catch (err) {
          console.error('添加购物车失败:', err);
          alert('无法连接服务器，请稍后重试。');
        }
      });
    });
  }
});
