// 函数：生成一个随机的订单号
function generateOrderId() {
    const prefix = 'ORD-';
    const randomNumber = Math.floor(Math.random() * 1000000000); // 生成一个9位的随机数字
    return prefix + randomNumber;
}

// 获取商品信息
async function getProductDetails(orderId) {
    try {
        const response = await fetch(`/product/${orderId}`);
        if (!response.ok) {
            throw new Error('商品未找到');
        }
        const product = await response.json();

        // 更新页面内容
        document.getElementById('product-name').innerText = product.name; // 假设商品对象中有 name 字段
        document.getElementById('price').innerText = `¥${product.price}`; // 假设商品对象中有 price 字段
    } catch (error) {
        console.error(error);
        document.getElementById('product-name').innerText = '加载失败';
        document.getElementById('price').innerText = '加载失败';
    }
}

// 页面加载完成后，替换订单号并加载商品信息
window.onload = function() {
    const orderId = generateOrderId(); // 生成随机订单号
    const orderIdElement = document.getElementById('order-id');
    if (orderIdElement) {
        orderIdElement.textContent = orderId; // 替换为生成的订单号
    }

    // 获取商品信息
    getProductDetails(orderId);  // 使用生成的订单号去获取商品信息

    // 为"去支付"按钮添加点击事件
    const confirmButton = document.getElementById('confirm-order');
    if (confirmButton) {
        confirmButton.addEventListener('click', function() {
            window.location.href = 'payment.html';  // 跳转到 payment 页面
        });
    }
};
