import fp from "fastify-plugin";
import { createClient } from "@supabase/supabase-js";
import { config } from "../config/index.js";
export const supabase = createClient(config.supabaseUrl, config.supabaseKey);
export default fp(async (fastify) => {
    fastify.decorate("supabase", supabase);
    fastify.log.info("Supabase client initialized");
});
//# sourceMappingURL=supabase.js.map