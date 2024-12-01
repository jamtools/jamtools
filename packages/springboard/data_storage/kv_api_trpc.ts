import {z} from 'zod';

import {initTRPC} from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import {KVEntry, KyselyKVStore} from './kv_store_db_types';

export const makeKVTrpcRouter = (db: KyselyKVStore) => {
    const createContext = ({
        req,
        res,
    }: trpcExpress.CreateExpressContextOptions) => ({});

    type TrpcContext = Awaited<ReturnType<typeof createContext>>;
    const t = initTRPC.context<TrpcContext>().create();

    const trpcRouter = t.router({
        kvGet: t.procedure
            .input(z.object({
                key: z.string(),
            }))
            .query(async (opts) => {
                return db.selectFrom('kvstore')
                    .select(['value'])
                    .where('key', '=', opts.input.key)
                    .executeTakeFirst().then(result => result?.value);
            }),
        kvGetAll: t.procedure
            .query(async () => {
                return db.selectFrom('kvstore')
                    .select(['key', 'value'])
                    .execute();
            }),
        kvPut: t.procedure
            .input(z.object({
                key: z.string(),
                value: z.string(),
            }))
            .mutation(async (opts) => {
                await db
                    .insertInto('kvstore')
                    .values({key: opts.input.key, value: opts.input.value})
                    .onConflict((oc) =>
                        oc
                            .columns(['key'])
                            .where('key', '=', opts.input.key)
                            .doUpdateSet({value: opts.input.value})
                    )
                    .execute();
                return {message: `updated ${opts.input.key} to ${opts.input.value}`}
            }),

    });

    return trpcRouter;
}

export type KVTrpcRouter = ReturnType<typeof makeKVTrpcRouter>;
