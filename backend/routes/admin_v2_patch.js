// ADD these endpoints to backend/routes/admin.js BEFORE export default router;

// ── Admin Prompt Settings ──
router.get('/prompt-settings', async (req, res) => {
  try {
    const {rows} = await query('SELECT * FROM admin_settings ORDER BY category, key');
    res.json(rows);
  } catch(err){res.status(500).json({error:err.message});}
});

router.put('/prompt-settings', async (req, res) => {
  const {category, key, value, description} = req.body;
  try {
    await query(`INSERT INTO admin_settings (category,key,value,description) VALUES ($1,$2,$3,$4)
      ON CONFLICT (category,key) DO UPDATE SET value=$3, description=$4, updated_at=NOW()`,
      [category, key, value, description||'']);
    res.json({success:true});
  } catch(err){res.status(500).json({error:err.message});}
});

router.get('/prompt-settings/:category', async (req, res) => {
  try {
    const {rows} = await query('SELECT * FROM admin_settings WHERE category=$1',[req.params.category]);
    res.json(rows);
  } catch(err){res.status(500).json({error:err.message});}
});
