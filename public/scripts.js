document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/product/all');
    const products = await response.json();

    const productContainer = document.querySelector('.product-list');
    products.forEach(product => {
      const productElement = document.createElement('div');
      productElement.classList.add('product-item');
      productElement.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>价格: ¥${product.price}</p>
        <button>立即购买</button>
      `;
      productContainer.appendChild(productElement);
    });
  } catch (err) {
    console.error("无法获取商品数据:", err);
  }
});
