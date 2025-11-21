const db = require('../config/database');

async function seedReviews() {
  const data = [
    { product_id: 288, items: [
      { user_name: '匿名买家', content: '外观精致，手感顺滑，系统很流畅。', rating: 5 },
      { user_name: '用户B', content: '充电速度快，屏幕显示细腻，性价比高。', rating: 4 }
    ]},
    { product_id: 287, items: [
      { user_name: '用户C', content: '影像表现优秀，续航一天无压力。', rating: 5 },
      { user_name: '用户D', content: '做工扎实，生态体验好。', rating: 4 }
    ]},
    { product_id: 227, items: [
      { user_name: '玩家一号', content: '麦克风清晰，佩戴舒适，长时间不压头。', rating: 5 },
      { user_name: '小张', content: '声音定位好，打游戏很稳。', rating: 4 }
    ]},
    { product_id: 201, items: [
      { user_name: 'Ashley', content: '壳子手感细腻不粘灰，镜头保护到位。', rating: 5 },
      { user_name: '若初见', content: '贴合度高，颜色好看。', rating: 4 }
    ]},
  ];

  for (const group of data) {
    const exists = await db.getAsync('SELECT id FROM products WHERE id = ?', [group.product_id]);
    if (!exists) continue;
    await db.runAsync('DELETE FROM reviews WHERE product_id = ?', [group.product_id]);
    for (const r of group.items) {
      await db.runAsync(
        `INSERT INTO reviews (product_id, user_name, content, rating, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [group.product_id, r.user_name, r.content, r.rating]
      );
    }
    console.log(`✔️  seeded reviews for product ${group.product_id}`);
  }
}

if (require.main === module) {
  seedReviews()
    .then(() => { console.log('✅ Seed reviews completed'); process.exit(0); })
    .catch((e) => { console.error('❌ Seed reviews failed:', e); process.exit(1); });
}

module.exports = seedReviews;
