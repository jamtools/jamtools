#!/bin/bash

echo 'export default `' > src/example/index-as-string.ts
cat example/index.tsx >> src/example/index-as-string.ts
echo '`;' >> src/example/index-as-string.ts
