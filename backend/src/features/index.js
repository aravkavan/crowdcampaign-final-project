// All the new feature routes in one place. app.js mounts this under /api.
import { Router } from 'express';
import { agentsRouter } from './agents/routes.js';
import { brandRouter } from './brand/routes.js';
import { contextRouter } from './context/routes.js';
import { imagesRouter } from './images/routes.js';
import { imageMakerLabel, imageMakerReady } from './images/cloudflare.js';
import { requireAuth } from '../auth/requireAuth.js';

export const featuresRouter = Router();

// What is switched on, so the UI can label things honestly.
featuresRouter.get('/features/status', requireAuth, (req, res) => {
  res.json({ images: { real: imageMakerReady(), label: imageMakerLabel() } });
});

featuresRouter.use(brandRouter);
featuresRouter.use(contextRouter);
featuresRouter.use(agentsRouter);
featuresRouter.use(imagesRouter);
