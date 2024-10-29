import { z, ZodObject } from 'zod';

// Middleware type that can access args and modify context
type Middleware<Args = unknown, Ctx extends object = {}> = (args: Args, context: Ctx) => Promise<Partial<Ctx>>;

// Module API class with method chaining to compose action
class ModuleAPI {
    // Method for composing actions with method-chained middleware
    composeAction<Args = unknown, Ctx extends object = {}>() {
        return new ActionBuilder<Args, Ctx>();
    }
}

// ActionBuilder class to allow chaining of middleware
class ActionBuilder<Args = unknown, Ctx extends object = {}> {
    private middlewares: Array<Middleware<Args, Ctx>> = [];

    // Add middleware that decorates the args or context
    addMiddleware<M extends object>(middleware: Middleware<Args, Ctx & M>) {
        this.middlewares.push(middleware);
        return this as ActionBuilder<Args, Ctx & M>; // Ensure inferred type accumulates across methods
    }

    // Final step to execute the action after the middleware chain
    createAction<ReturnValue>(callback: (args: Args, context: Ctx) => Promise<ReturnValue>) {
        return async (args: Args): Promise<ReturnValue> => {
            let context = {} as Ctx;

            // Execute the middleware chain, building up the context
            for (const middleware of this.middlewares) {
                const newContext = await middleware(args, context);
                context = { ...context, ...newContext };
            }

            return callback(args, context);  // Execute the final action
        };
    }
}

// Zod middleware to validate args and add `parsed` to the context
const zodMiddleware = <Schema extends ZodObject<any>>(schema: Schema): Middleware<z.infer<Schema>> => {
    return async (args, context) => {
        const parsed = schema.parse(args);  // Validate args using the Zod schema
        return {  };  // Add parsed data to the context
    };
};

// Logging middleware that adds requestTime to the context
const loggingMiddleware: Middleware<any, {requestTime: string}> = async (args) => {
    return { requestTime: new Date().toISOString() };
};

// An example of an args-transforming middleware that adds fields to args
const transformArgsMiddleware = <A extends object>(transformer: (args: A) => A): Middleware<A, {}> => {
    return async (args) => {
        const transformedArgs = transformer(args);
        console.log('Transformed args:', transformedArgs);
        return {};  // This middleware modifies args but doesn't change context
    };
};

// Define a Zod schema for validation
const schema = z.object({
    setlistId: z.string(),
    song: z.object({
        url: z.string(),
        transpose: z.number(),
    }),
});

const schema2 = z.object({
    setlistId2: z.string(),
    song: z.object({
        url: z.string(),
        transpose: z.number(),
    }),
});

// Create an instance of ModuleAPI
const api = new ModuleAPI();

const composeMiddlewares = <Args, Ctx extends object>(
    ...middlewares: Middleware<Args, Ctx>[]
): Middleware<Args, Ctx> => {
    return async (args: Args, context: Ctx): Promise<Partial<Ctx>> => {
        let currentContext = context;
        for (const middleware of middlewares) {
            const newContext = await middleware(args, currentContext);
            currentContext = { ...currentContext, ...newContext };
        }
        return currentContext;
    };
};

// Compose the action with chained middleware
const queueSongForNext = api.composeAction<z.infer<typeof schema>>()  // `args` is inferred from Zod schema
    .addMiddleware(zodMiddleware(schema))      // Zod validation middleware
    // .addMiddleware(loggingMiddleware)          // Logging middleware
    .addMiddleware(composeMiddlewares(
        async (x) => {
            return {newthing: 'yeah'};
        },
        // loggingMiddleware,
        // zodMiddleware(schema),
    ))
    // .addMiddleware(transformArgsMiddleware((args) => {
    //     // Example transformation: Add a timestamp to the song
    //     return { ...args, song: { ...args.song, timestamp: new Date().toISOString() } };
    // }))
    .addMiddleware(async () => {
        return {
            x: 's'
        };
    })
    // .addMiddleware(async (x) => {
    //     return {newthing: 'yeah'}
    // })
    .addMiddleware(loggingMiddleware)          // Logging middleware
    .addMiddleware(composeMiddlewares(
        async (x) => ({
            e: 's'
        }),
        // zodMiddleware(schema),
    ))



    .createAction(async (args, context) => {
        // The final action gets the parsed args and the context
        // if (context.parsed) {
        //     console.log('Executing action with parsed data:', context.parsed);
        // }
        console.log('Request time:', context.requestTime);
        return 'Success';
    });

// Execute the action with valid data
queueSongForNext({
    setlistId: 'abc',
    song: {
        url: 'http://example.com',
        transpose: 1
    }
}).then(result => console.log(result)).catch(err => console.error(err));

// Execute the action with invalid data (will throw validation error)
queueSongForNext({
    setlistId: 123,  // Invalid type for setlistId
    song: {
        url: 'http://example.com',
        transpose: 'invalid'  // Invalid type for transpose
    }
}).catch(err => console.error('Validation error:', err.errors));
