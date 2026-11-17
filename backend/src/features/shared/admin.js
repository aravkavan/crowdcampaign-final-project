// The grader account (ADMIN_USERNAMES, default NYUgrader) can manage every campaign.
// Everyone else can manage only the campaigns they organize.
import { config } from '../../config.js';

export function isAdmin(user) {
  return Boolean(user?.username) && config.adminUsernames.includes(String(user.username).toLowerCase());
}
