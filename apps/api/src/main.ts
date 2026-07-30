import { createApiContext, createApiRuntimeConfig, createApiServer } from '@sf/api-routes';

async function main() {
  const runtimeConfig = createApiRuntimeConfig();
  const context = createApiContext();
  const app = await createApiServer(context);

  await app.listen({
    port: runtimeConfig.port,
    host: runtimeConfig.host,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
