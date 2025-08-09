We're making an application framework in this repo. Some general information on the framework can be found here:
doks/content/docs/springboard/overview.md

The `packages/springboard/platforms` folder shows the different ways the framework can be deployed. There's 3 client-side things, and 2 server-side things. The task we're working on now pertains to the server-side ones:

- node
- partykit


There is an additional package `packages/springboard/server` that has some common code for the server things. This package is meant to be a way to register certain things in the context of server-only code in a springboard app. One problem is that there is lots of node-specific code that we need to remove. A platform-agnostic Hono server is used for organizing server code to be accessed by the application.

There's also a bit of baggage on how the server platforms are built. The server bundles are built twice, once to be a client/server-agnostic program, and again with assumptions of being a running server. This distinction doesn't make much sense, as we're just building platform-specific code either way. We can just have different entrypoints for each platform/use-case instead of having two build functions to be run.

packages/springboard/cli/src/build.ts:161
161: export const buildApplication = async (buildConfig: BuildConfig, options?: ApplicationBuildOptions) => {

packages/springboard/cli/src/build.ts:296
296: export const buildServer = async (options?: ServerBuildOptions) => {

(we should just need buildApplication and not buildServer)


The main thing I want to focus on is removing node-specific code from the springboard-server package. *We want to introduce a new cloudflare-workers platform entrypoint*, so we need to un-nodeify things. Check how things were done in the partykit one, since that's a little closer to cloudflare's environment. We want to be DRY, and make `springboard-server` as generic and extendible as possible
