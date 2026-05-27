import type { Request, Response } from 'express';
import type { Pool } from 'pg';

export type ServiceStatus = 'operational' | 'degraded' | 'outage';

export type HealthService = {
  id: string;
  name: string;
  status: ServiceStatus;
  detail: string;
};

export type HealthReport = {
  status: 'operational' | 'degraded' | 'major_outage';
  database: 'connected' | 'disconnected';
  checkedAt: string;
  version: string;
  services: HealthService[];
};

const APP_VERSION = process.env.npm_package_version || '1.0.0';

export function wantsHtmlStatus(req: Request): boolean {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) return true;
  if (accept.includes('application/json') && !accept.includes('*/*')) return false;
  const ua = req.headers['user-agent'] || '';
  return /Mozilla|Chrome|Safari|Firefox|Edg/i.test(ua);
}

export async function getHealthReport(pool: Pool): Promise<HealthReport> {
  let database: HealthReport['database'] = 'disconnected';

  try {
    await pool.query('SELECT 1');
    database = 'connected';
  } catch {
    database = 'disconnected';
  }

  const dbStatus: ServiceStatus = database === 'connected' ? 'operational' : 'outage';

  const services: HealthService[] = [
    {
      id: 'web',
      name: 'Aplicação web',
      status: 'operational',
      detail: 'Interface e painel do Aplica PRO',
    },
    {
      id: 'api',
      name: 'API',
      status: 'operational',
      detail: 'Autenticação, orçamentos e catálogo',
    },
    {
      id: 'database',
      name: 'Banco de dados',
      status: dbStatus,
      detail: database === 'connected' ? 'Respondendo normalmente' : 'Sem resposta no momento',
    },
  ];

  const status: HealthReport['status'] =
    database === 'connected' ? 'operational' : 'major_outage';

  return {
    status,
    database,
    checkedAt: new Date().toISOString(),
    version: APP_VERSION,
    services,
  };
}

const STATUS_LABELS: Record<HealthReport['status'], string> = {
  operational: 'Todos os sistemas operacionais',
  degraded: 'Desempenho degradado',
  major_outage: 'Interrupção em andamento',
};

const STATUS_SUBTITLES: Record<HealthReport['status'], string> = {
  operational: 'O Aplica PRO está disponível e respondendo normalmente.',
  degraded: 'Alguns serviços podem apresentar lentidão ou erros intermitentes.',
  major_outage: 'Estamos com problemas que podem impedir o uso da plataforma.',
};

const SERVICE_LABELS: Record<ServiceStatus, string> = {
  operational: 'Operacional',
  degraded: 'Degradado',
  outage: 'Indisponível',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderStatusPageHtml(report: HealthReport, baseUrl: string): string {
  const appUrl = baseUrl.replace(/\/$/, '') || '/';
  const checkedLocal = new Date(report.checkedAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  const bannerClass =
    report.status === 'operational'
      ? 'banner--ok'
      : report.status === 'degraded'
        ? 'banner--warn'
        : 'banner--down';

  const servicesHtml = report.services
    .map((s) => {
      const pillClass =
        s.status === 'operational' ? 'pill--ok' : s.status === 'degraded' ? 'pill--warn' : 'pill--down';
      return `
        <li class="service">
          <div class="service__main">
            <span class="service__dot service__dot--${s.status}" aria-hidden="true"></span>
            <div>
              <p class="service__name">${escapeHtml(s.name)}</p>
              <p class="service__detail">${escapeHtml(s.detail)}</p>
            </div>
          </div>
          <span class="pill ${pillClass}">${SERVICE_LABELS[s.status]}</span>
        </li>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="60" />
  <title>Status — Aplica PRO</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --ok: #22c55e;
      --warn: #eab308;
      --down: #ef4444;
      --indigo: #818cf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
    }
    .wrap { max-width: 720px; margin: 0 auto; padding: 2.5rem 1.25rem 3rem; }
    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .brand__title {
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .brand__sub {
      font-size: 0.7rem;
      color: var(--indigo);
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-family: ui-monospace, monospace;
    }
    .brand a {
      color: var(--muted);
      font-size: 0.875rem;
      text-decoration: none;
    }
    .brand a:hover { color: var(--text); }
    .banner {
      border-radius: 1rem;
      padding: 1.5rem 1.25rem;
      margin-bottom: 1.75rem;
      border: 1px solid var(--border);
    }
    .banner--ok { background: rgba(34, 197, 94, 0.12); border-color: rgba(34, 197, 94, 0.35); }
    .banner--warn { background: rgba(234, 179, 8, 0.12); border-color: rgba(234, 179, 8, 0.35); }
    .banner--down { background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.35); }
    .banner h1 { font-size: 1.35rem; font-weight: 700; margin-bottom: 0.35rem; }
    .banner p { color: var(--muted); font-size: 0.95rem; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      overflow: hidden;
    }
    .card__head {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      font-weight: 600;
    }
    .services { list-style: none; }
    .service {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .service:last-child { border-bottom: none; }
    .service__main { display: flex; align-items: flex-start; gap: 0.75rem; min-width: 0; }
    .service__dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 0.35rem;
      flex-shrink: 0;
    }
    .service__dot--operational { background: var(--ok); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25); }
    .service__dot--degraded { background: var(--warn); box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.25); }
    .service__dot--outage { background: var(--down); box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25); }
    .service__name { font-weight: 600; font-size: 0.95rem; }
    .service__detail { font-size: 0.8rem; color: var(--muted); margin-top: 0.15rem; }
    .pill {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .pill--ok { background: rgba(34, 197, 94, 0.15); color: #86efac; }
    .pill--warn { background: rgba(234, 179, 8, 0.15); color: #fde047; }
    .pill--down { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
    .meta {
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: var(--muted);
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
    }
    .meta code {
      font-family: ui-monospace, monospace;
      font-size: 0.75rem;
      background: var(--card);
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      border: 1px solid var(--border);
    }
    .json-link { margin-top: 1rem; font-size: 0.8rem; }
    .json-link a { color: var(--indigo); }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="brand">
      <div>
        <p class="brand__sub">Aplica PRO</p>
        <p class="brand__title">Status do sistema</p>
      </div>
      <a href="${escapeHtml(appUrl)}">Ir para o app →</a>
    </header>

    <section class="banner ${bannerClass}" role="status" aria-live="polite">
      <h1>${escapeHtml(STATUS_LABELS[report.status])}</h1>
      <p>${escapeHtml(STATUS_SUBTITLES[report.status])}</p>
    </section>

    <section class="card" aria-label="Componentes">
      <div class="card__head">Componentes</div>
      <ul class="services">${servicesHtml}</ul>
    </section>

    <footer class="meta">
      <span>Última verificação: <strong>${escapeHtml(checkedLocal)}</strong> (Brasília)</span>
      <span>Versão <code>v${escapeHtml(report.version)}</code></span>
      <span>Atualiza a cada 60s</span>
    </footer>
    <p class="json-link"><a href="/api/health" rel="noopener">Ver resposta JSON</a> · <a href="/status">/status</a></p>
  </div>
</body>
</html>`;
}

export async function handleHealthRequest(
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> {
  const report = await getHealthReport(pool);
  const httpStatus = report.database === 'connected' ? 200 : 503;

  if (wantsHtmlStatus(req)) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const baseUrl = process.env.APP_URL || `${proto}://${host}`;
    res.status(httpStatus).type('html').send(renderStatusPageHtml(report, baseUrl));
    return;
  }

  res.status(httpStatus).json({
    status: report.status === 'operational' ? 'ok' : 'error',
    database: report.database,
    checkedAt: report.checkedAt,
    version: report.version,
    services: report.services,
  });
}
