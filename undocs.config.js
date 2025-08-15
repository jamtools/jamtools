export default {
  title: 'Jam Tools',
  description: 'Create your own music performance system with Jam Tools',
  base: '/',
  
  themeConfig: {
    nav: [
      { text: 'Docs', link: '/introduction/overview' },
      { text: 'GitHub', link: 'https://github.com/jamtools/jamtools' },
      { text: 'Discord', link: 'https://jam.tools/discord' }
    ],
    
    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Overview', link: '/introduction/overview' },
            { text: 'Quickstart', link: '/introduction/quickstart' }
          ]
        },
        {
          text: 'Jam Tools',
          items: [
            { text: 'Overview', link: '/jamtools/overview' },
            { text: 'Macro Module', link: '/jamtools/macro-module' },
            { text: 'MIDI IO Module', link: '/jamtools/midi-io-module' }
          ]
        },
        {
          text: 'Springboard',
          items: [
            { text: 'Overview', link: '/springboard/overview' },
            { text: 'Module Development', link: '/springboard/module-development' },
            { text: 'Conditional Compilation', link: '/springboard/conditional-compilation' },
            { text: 'RPC', link: '/springboard/rpc' }
          ]
        },
        {
          text: 'Springboard CLI',
          items: [
            { text: 'Overview', link: '/springboard/cli/' },
            { text: 'sb command', link: '/springboard/cli/CLI_DOCS_sb' },
            { text: 'create-springboard-app', link: '/springboard/cli/CLI_DOCS_create-springboard-app' }
          ]
        },
        {
          text: 'Guides',
          items: [
            { text: 'Registering UI Routes', link: '/springboard/guides/registering-ui-routes' }
          ]
        },
        {
          text: 'Platforms',
          items: [
            { text: 'Desktop App', link: '/springboard/platforms/desktop-app' },
            { text: 'Mobile App', link: '/springboard/platforms/mobile-app' },
            { text: 'Node Server', link: '/springboard/platforms/node-server' },
            { text: 'Static Site', link: '/springboard/platforms/static-site' }
          ]
        },
        {
          text: 'Plugins',
          items: [
            { text: 'Overview', link: '/springboard/plugins/overview' },
            { text: 'Svelte Plugin', link: '/springboard/plugins/svelte_plugin_docs' }
          ]
        },
        {
          text: 'RPi Deploy',
          items: [
            { text: 'Overview', link: '/rpi-deploy/overview' }
          ]
        }
      ]
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jamtools/jamtools' },
      { icon: 'discord', link: 'https://jam.tools/discord' }
    ]
  }
}