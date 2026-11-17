// Registers a route that needs a login AND the campaign's organizer.
//   organizerRoute(router, 'post', '/campaigns/:id/thing', async (req, res, campaign) => { ... })
import { requireAuth } from '../../auth/requireAuth.js';
import { loadCampaign, requireOrganizer } from '../../routes/campaigns.js';

export function organizerRoute(router, method, path, handler) {
  router[method](path, requireAuth, async (req, res) => {
    const campaign = await loadCampaign(req.params.id, req.user.id);
    requireOrganizer(campaign);
    return handler(req, res, campaign);
  });
}
