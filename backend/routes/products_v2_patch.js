// This file shows what to ADD/CHANGE in existing backend/routes/products.js
// Add these new endpoints BEFORE "export default router;"

// ── 360 View ──
router.post('/:id/generate-360', upload.single('model_image'), async (req, res) => {
  try {
    const {rows:products} = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2',[req.params.id,req.user.id]);
    if(!products.length) return res.status(404).json({error:'Product not found'});
    const product = products[0];
    const costs = await getCreditCosts(req.user.id);
    const totalCredits = 4 * costs.credits_per_image;
    await ensureCreditsAvailable(req.user.id, totalCredits);
    const {generate360View} = await import('../services/geminiAgents.js');
    const results = await generate360View(product.original_image, req.file?.path||null, product);
    if(!results.length) throw new Error('360 generation failed');
    await useCredits(req.user.id, results.length * costs.credits_per_image);
    const savedImages = [];
    for(const r of results){
      const buf = Buffer.from(r.imageData,'base64');
      const {uploadToCloudinary,isCloudinaryEnabled} = await import('../services/cloudinaryService.js');
      let savedUrl;
      if(isCloudinaryEnabled()){savedUrl=await uploadToCloudinary(buf,{folder:`clothvision/${req.user.id}`});}
      else{const outPath=makeUploadPath(req.user.id,`360_${uuidv4()}.jpg`);fs.writeFileSync(outPath,buf);savedUrl=outPath;}
      const {rows} = await query('INSERT INTO generated_images (product_id,owner_id,image_type,angle,image_url,credits_used) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [product.id,req.user.id,'view_360',r.angle,savedUrl,costs.credits_per_image]);
      savedImages.push(rows[0]);
    }
    await query('INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',[req.user.id,'use',results.length*costs.credits_per_image,`360 view: "${product.name}"`]);
    res.json({success:true, images:savedImages, credits_used:results.length*costs.credits_per_image});
  } catch(err){res.status(err.message==='Insufficient credits'?402:500).json({error:err.message});}
});

// ── Size Measurement ──
router.post('/:id/measure', async (req, res) => {
  try {
    const {rows} = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2',[req.params.id,req.user.id]);
    if(!rows.length) return res.status(404).json({error:'Product not found'});
    const {measureProductSize} = await import('../services/geminiAgents.js');
    const measurement = await measureProductSize(rows[0].original_image, rows[0]);
    res.json(measurement);
  } catch(err){res.status(500).json({error:err.message});}
});
