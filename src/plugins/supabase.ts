
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/index.js";

export const supabase = createClient(config.supabaseUrl, config.supabaseKey);

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate("supabase", supabase);
  fastify.log.info("Supabase client initialized");
});

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}
