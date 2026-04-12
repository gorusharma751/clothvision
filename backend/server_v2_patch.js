// ADD these lines to backend/server.js

// IMPORT (add with other imports at top):
import videoRoutes from './routes/video.js';
import labelRoutes from './routes/label.js';

// ROUTES (add with other app.use lines):
app.use('/api/video', videoRoutes);
app.use('/api/label', labelRoutes);
