sed -i 's/\\//g' "./node_modules/typedoc-plugin-markdown/dist/theme/context/helpers/get-angle-bracket.js"

if grep -q 'typeParameters' ./node_modules/typedoc-plugin-markdown/dist/theme/context/partials/member.signature.js; then
    sed -i '' '39,75d' ./node_modules/typedoc-plugin-markdown/dist/theme/context/partials/member.signature.js
fi
