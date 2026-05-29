const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Elimina el entitlement aps-environment del build de iOS.
 * Necesario para buildear con una cuenta gratuita de Apple Developer.
 * Cuando se pague el Apple Developer Program ($99/año), eliminar este plugin
 * del array de plugins en app.config.ts para re-habilitar push notifications.
 */
const withoutPushNotifications = (config) => {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};

module.exports = withoutPushNotifications;
