// ADD to backend/routes/products.js BEFORE export default router;
// This handles 360 without existing product ID

router.post('/generate-360-direct', upload.fields([{name:'product_image'},{name:'model_image'}]), async (req, res) => {
  try {
    if(!req.files?.product_image) return res.status(400).json({error:'Product image required'});
    const costs = await getCreditCosts(req.user.id);
    const totalCredits = 4 * costs.credits_per_image;
    await ensureCreditsAvailable(req.user.id, totalCredits);

    const productDetails = {
      name: req.body.product_name || 'Product',
      category: req.body.product_category || 'clothing',
      color: req.body.product_color || '',
    };

    const results = await generate360View(
      req.files.product_image[0].path,
      req.files?.model_image?.[0]?.path || null,
      productDetails
    );

    if(!results.length) throw new Error('360 generation failed');

    await useCredits(req.user.id, results.length * costs.credits_per_image);

    const savedImages = [];
    for(const r of results) {
      const buf = Buffer.from(r.imageData, 'base64');
      let savedUrl;
      if(isCloudinaryEnabled()) {
        savedUrl = await uploadToCloudinary(buf, {folder:`clothvision/${req.user.id}`});
      } else {
        const outPath = makeUploadPath(req.user.id, `360_${uuidv4()}.jpg`);
        fs.writeFileSync(outPath, buf);
        savedUrl = outPath;
      }
      savedImages.push({ angle: r.angle, url: savedUrl });
    }

    await query('INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',
      [req.user.id,'use',results.length*costs.credits_per_image,`360 view: "${productDetails.name}"`]);

    res.json({ success: true, images: savedImages, credits_used: results.length * costs.credits_per_image });
  } catch(err) {
    res.status(err.message==='Insufficient credits'?402:500).json({error:err.message});
  }
});
