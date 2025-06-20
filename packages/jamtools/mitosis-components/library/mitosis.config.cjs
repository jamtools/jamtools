
/**
 * @type {import('@builder.io/mitosis').MitosisConfig}
 */
module.exports = {
  "files": "src/**",
  "targets": [
    "react",
    "svelte"
  ],
  plugins: [
    {
      name: 'ensure-from-html-import',
      code: {
        post: (code) => {
          if (code.includes('from_html(') && !code.includes("import { from_html")) {
            return `import { from_html } from 'svelte/internal';\n` + code;
          }
          return code;
        }
      }
    }
  ],
  "dest": "../../core/modules/macro_module/macro_handlers/inputs/components",
  "commonOptions": {
    "typescript": true
  },
  "options": {
    "react": {
      "stylesType": "style-tag"
    },
    "svelte": {},
    "qwik": {}
  }
}
