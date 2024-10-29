import { z, ZodObject } from 'zod';

// Define a Middleware type, which processes args and passes control to the next middleware or action callback.
type Middleware<Args> = (args: Args, next: (newArgs: Args) => Promise<any>) => Promise<any>;

// Action callback type that processes the validated args.
type ActionCallback<Args, ReturnValue = any> = (args: Args) => Promise<ReturnValue>;

class ModuleAPI {
    // Method to create an action with middlewares, similar to Express-style.
    createAction<Args, ReturnValue>(
        actionName: string,
        cb: ActionCallback<Args, ReturnValue>,
        ...middlewares: Middleware<Args>[]
    ): ActionCallback<Args, ReturnValue> {
        // Compose middleware chain and return the final function.
        const composedMiddleware = this.composeMiddleware(cb, middlewares);
        return (args: Args) => composedMiddleware(args);
    }

    // Compose the middleware chain to ensure they're executed in order.
    private composeMiddleware<Args>(
        cb: ActionCallback<Args>,
        middlewares: Middleware<Args>[]
    ): (args: Args) => Promise<any> {
        // Dispatch method to iterate through middleware and finally call the action callback.
        const dispatch = (i: number, args: Args): Promise<any> => {
            if (i === middlewares.length) return cb(args); // If no more middleware, call the action.
            const middleware = middlewares[i];
            return middleware(args, (newArgs) => dispatch(i + 1, newArgs)); // Call the next middleware.
        };
        return (args: Args) => dispatch(0, args); // Start the middleware chain.
    }
}

// Zod validation middleware to validate args with a provided Zod schema.
const zodMiddleware = <Schema extends ZodObject<any>>(schema: Schema): Middleware<z.infer<Schema>> => {
    return async (args, next) => {
        schema.parse(args);  // Validate the args using Zod schema.
        return next(args);    // If valid, call the next middleware or action.
    };
};

// Define a Zod schema for validation.
const schema = z.object({
    setlistId: z.string(),
    song: z.object({
        url: z.string(),
        transpose: z.number(),
    }),
});

// Create an instance of ModuleAPI.
const moduleAPI = new ModuleAPI();

// Define an action using createAction, with the Zod validation middleware and the final action logic.
const queueSongForNext = moduleAPI.createAction(
    'queueSongForNext',
    async (args) => {
        console.log('Executing action:', args); // The final action logic after middleware validation.
        return 'Success';
    },
    zodMiddleware(schema) // Middleware that validates the args based on the Zod schema.
);

// Execute the action with valid data.
queueSongForNext({
    setlistId: 'abc',
    song: {
        url: 'http://example.com',
        transpose: 1
    }
}).then(result => console.log(result));

// Execute the action with invalid data (will throw a Zod validation error).
queueSongForNext({
    setlistId: 123,  // This will fail validation as setlistId should be a string
    song: {
        url: 'http://example.com',
        transpose: 'invalid'  // This will fail validation as transpose should be a number
    }
}).catch(err => console.error('Validation error:', err.errors));
