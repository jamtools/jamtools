# Conditional Compilation

Springboard supports conditional compilation, which allows you to write code that is only included in the build for a given platform. This is useful for writing platform-specific code that won't compile in another platform's context, like when we want to use a specific node package/API in a an otherwise isomorphic file.

```ts
let someFunc = async (someArg: string): Promise<void> => {
    console.log('default handler', someArg);
};

// @platform "node"
someFunc = async (someArg) => {
    const fs = await import('fs');
    console.log('node handler', fs.readFileSync(someArg));
};
// @platform end

// @platform "browser"
someFunc = async (someArg) => {
    console.log('browser handler', someArg);
};
// @platform end

// @platform "react-native"
someFunc = async (someArg) => {
    console.log('react-native handler', someArg);
};
// @platform end
```

When compiling for node, the output code will look like this:

```ts
let someFunc = async (someArg) => {
    console.log('default handler', someArg);
};

someFunc = async (someArg) => {
    const fs = await import('fs');
    console.log('node handler', fs.readFileSync(someArg));
};
```

Note that it could have also been written as the following, specifying a special case for only one platform:

```ts
let someFunc = async (someArg: string): Promise<void> => {
    console.log('default handler', someArg);
};

// @platform "node"
someFunc = async (someArg) => {
    const fs = await import('fs');
    console.log('node handler', fs.readFileSync(someArg));
};
// @platform end
```

---

We'll likely move to a more explicit `if` syntax instead of the `@platform` syntax, taking inspiration from [esbuild-ifdef](https://github.com/zziger/esbuild-ifdef):

```ts
let someFunc = async (someArg: string): Promise<void> => {
    console.log('default handler', someArg);
};

/// #if platform = "node"
someFunc = async (someArg) => {
    const fs = await import('fs');
    console.log('node handler', fs.readFileSync(someArg));
};
/// #endif

/// #if NODE_ENV = "production"
// ...code that is only included in production build
/// #endif
```