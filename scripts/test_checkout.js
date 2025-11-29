const db = require('../config/database');
const orderController = require('../controllers/orderController');

async function seed() {
  await db.runAsync('BEGIN TRANSACTION');
  try {
    const userId = 'u_test_checkout';
    await db.runAsync(`DELETE FROM users WHERE id = ?`, [userId]);
    await db.runAsync(`INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)`, [userId, 'test_user', 'test@star.com', 'x']);

    // clean previous cart
    const oldCart = await db.getAsync(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    if (oldCart) {
      await db.runAsync(`DELETE FROM cart_items WHERE cart_id = ?`, [oldCart.id]);
      await db.runAsync(`DELETE FROM carts WHERE id = ?`, [oldCart.id]);
    }

    // create products
    await db.runAsync(`DELETE FROM products WHERE name IN ('P1_Test','P2_Test')`);
    const p1 = await db.runAsync(`INSERT INTO products (name, price, stock) VALUES (?, ?, ?)`, ['P1_Test', 100, 10]);
    const p2 = await db.runAsync(`INSERT INTO products (name, price, stock) VALUES (?, ?, ?)`, ['P2_Test', 50, 5]);
    const p1Id = p1.lastID;
    const p2Id = p2.lastID;

    // create cart and items
    const cartRes = await db.runAsync(`INSERT INTO carts (user_id, total_price) VALUES (?, 0)`, [userId]);
    const cartId = cartRes.lastID;
    await db.runAsync(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`, [cartId, p1Id, 2]);
    await db.runAsync(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`, [cartId, p2Id, 1]);
    await db.runAsync('COMMIT');
    return { userId, cartId, p1Id, p2Id };
  } catch (e) {
    try { await db.runAsync('ROLLBACK'); } catch {}
    throw e;
  }
}

function mockReqRes(userId, items, totalAmount) {
  const req = { session: { userId }, body: { items, totalAmount, shippingAddress: {} } };
  let jsonOutput = null;
  const res = {
    status(code){ this.statusCode = code; return this; },
    json(data){ jsonOutput = { statusCode: this.statusCode || 200, body: data }; }
  };
  return { req, res, collect: () => jsonOutput };
}

async function run() {
  const { userId, cartId, p1Id, p2Id } = await seed();
  const items = [
    { productId: p1Id, quantity: 2, price: 100 },
    { productId: p2Id, quantity: 1, price: 50 }
  ];
  const totalAmount = 2 * 100 + 1 * 50;
  const { req, res, collect } = mockReqRes(userId, items, totalAmount);
  await orderController.createOrder(req, res);
  const result = collect();
  const cartItemsCount = await db.getAsync(`SELECT COUNT(1) AS c FROM cart_items WHERE cart_id = ?`, [cartId]);
  const p1Stock = await db.getAsync(`SELECT stock FROM products WHERE id = ?`, [p1Id]);
  const p2Stock = await db.getAsync(`SELECT stock FROM products WHERE id = ?`, [p2Id]);

  console.log('createOrder response:', JSON.stringify(result, null, 2));
  console.log('cart_items remain count:', cartItemsCount.c);
  console.log('p1 stock:', p1Stock.stock); // expect 8
  console.log('p2 stock:', p2Stock.stock); // expect 4

  const ok = result && result.body && result.body.success === true
    && cartItemsCount.c === 0 && p1Stock.stock === 8 && p2Stock.stock === 4;
  console.log('VERIFICATION:', ok ? 'PASS' : 'FAIL');
}

run().catch(e => { console.error('Test error:', e); process.exitCode = 1; });

