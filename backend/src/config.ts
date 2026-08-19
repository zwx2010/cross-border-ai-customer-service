export interface Environment {
  DIFY_BASE_URL?: string;
  DIFY_API_KEY?: string;
  MYSQL_URL?: string;
  PORT?: string;
}

export interface AppConfig {
  difyBaseUrl: string;
  difyApiKey: string;
  mysqlUrl: string;
  port: number;
}

export function loadConfig(env: Environment = process.env): AppConfig {
  const difyApiKey = env.DIFY_API_KEY?.trim();
  if (!difyApiKey) throw new Error('DIFY_API_KEY is required');

  const port = Number(env.PORT ?? 4100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  return {
    difyBaseUrl: (env.DIFY_BASE_URL ?? 'http://localhost/v1').replace(/\/$/, ''),
    difyApiKey,
    mysqlUrl: env.MYSQL_URL ?? 'mysql://customer_service:customer_service@localhost:3306/customer_service',
    port
  };
}
