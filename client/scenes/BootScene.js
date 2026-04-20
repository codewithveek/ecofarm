import { createAuth0Client } from '@auth0/auth0-spa-js'

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  async create() {
    // Initialise Auth0 client and store on registry for global access
    const auth0 = await createAuth0Client({
      domain:   import.meta.env.VITE_AUTH0_DOMAIN,
      clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        // Scopes map to agent permission tokens issued later
        scope: 'openid profile email water_farm plant_tree read_farm',
      },
    })

    this.registry.set('auth0', auth0)

    // Handle Auth0 redirect callback after login
    const query = window.location.search
    if (query.includes('code=') && query.includes('state=')) {
      await auth0.handleRedirectCallback()
      window.history.replaceState({}, document.title, '/')
    }

    const isAuthenticated = await auth0.isAuthenticated()
    this.registry.set('isAuthenticated', isAuthenticated)

    if (isAuthenticated) {
      const user = await auth0.getUser()
      this.registry.set('user', user)
    }

    this.scene.start('PreloadScene')
  }
}
