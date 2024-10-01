sed -i 's/\\//g' "./node_modules/typedoc-plugin-markdown/dist/theme/context/helpers/get-angle-bracket.js"

# this should be put into a more deterministic and idempotent solution. fork the typedoc-plugin-markdown repo maybe
if grep -q 'typeParameters' ./node_modules/typedoc-plugin-markdown/dist/theme/context/partials/member.signature.js; then
    sed -i '39,75d' ./node_modules/typedoc-plugin-markdown/dist/theme/context/partials/member.signature.js
fi

# also need to move "if (!options.nested)" block to the bottom for current formatting
