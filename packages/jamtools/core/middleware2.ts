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

// Function to compose middlewares
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

// Example middlewares
const loggingMiddleware: Middleware<any, { requestTime: string }> = async (args, context) => {
    console.log('Logging middleware: Before action, args:', args);
    return { requestTime: new Date().toISOString() };
};

const userMiddleware: Middleware<any, { userId: string }> = async (args, context) => {
    console.log('Logging middleware: Before action, args:', args);
    return { userId: new Date().toISOString() };
};

const dependencyMiddleware: Middleware<any, { requestTime: string, userId: string }> = async (args, context) => {
    if (!context.requestTime) {
        throw new Error('dependencyMiddleware requires \'requestTime\' to be available in context.');
    }
    return { userId: '12345' };
};

// Zod middleware to validate args
const zodMiddleware = <Schema extends ZodObject<any>>(schema: Schema): Middleware<z.infer<Schema>> => {
    return async (args, context) => {
        schema.parse(args);  // Validate args using the Zod schema
        return {};  // No context modification
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

// Create an instance of ModuleAPI
const api = new ModuleAPI();

// Example of chaining middlewares with dependency
const composedMiddleware = composeMiddlewares(
    loggingMiddleware,  // Adds `requestTime`
    userMiddleware,
    dependencyMiddleware  // Depends on `requestTime`
);

// Example usage with ModuleAPI
const queueSongForNext = api.composeAction<z.infer<typeof schema>>()
    .addMiddleware(zodMiddleware(schema))  // Zod validation middleware
    .addMiddleware(composedMiddleware)     // Use the composed middleware chain
    .createAction(async (args, context) => {
        console.log('Action executed with context:', context);
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
