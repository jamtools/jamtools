
/**
 * @type {import('@builder.io/mitosis').MitosisConfig}
 */
module.exports = {
  "files": "src/**",
  "targets": [
    "react",
    "svelte"
  ],
  "dest": "../../core/modules/macro_module/macro_handlers/inputs/components",
  "commonOptions": {
    "typescript": true
  },
  "options": {
    "react": {
      "stylesType": "style-tag"
    },
    "svelte": {
      "typescript": true,
      "preserveImports": true
    },
    "qwik": {}
  }
}
