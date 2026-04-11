import app, { initializeApp } from './app.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initializeApp();
  app.listen(PORT, () => {
    console.log(`🚀 ClothVision API running on port ${PORT}`);
  });
};

if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
  startServer().catch(err => {
    console.error('❌ Server startup failed');
    console.error(err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
  });
}

export default app;
export { initializeApp };
