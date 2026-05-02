import { FastifyInstance } from "fastify";
import { SupabaseClient } from "@supabase/supabase-js";
export declare const supabase: SupabaseClient<any, "public", "public", any, any>;
declare const _default: (fastify: FastifyInstance) => Promise<void>;
export default _default;
declare module "fastify" {
    interface FastifyInstance {
        supabase: SupabaseClient;
    }
}
//# sourceMappingURL=supabase.d.ts.map