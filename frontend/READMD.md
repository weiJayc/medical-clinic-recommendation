### This is README file for our backend developers LTY and eddie
// GET /api/places?lat=...&lng=...
app.get('/api/places', async (req, res) => {
  const { lat, lng } = req.query;

  // 先簡單全部吐出（之後可以加上距離篩選）
  const rows = await db.query(
    'SELECT id, name, address, lat, lng FROM places'
  );

  res.json(rows);
});
