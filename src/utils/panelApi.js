const PAGE_SIZE = 100;
const MAX_PAGES = 500; // safety cap against a runaway/misbehaving panel

export class PanelApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'PanelApiError';
    this.status = status;
  }
}

/** Low-level authenticated GET helper. Throws PanelApiError with a friendly message. */
async function request(baseUrl, apiKey, path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new PanelApiError('API key rejected by panel (invalid or insufficient permissions).', res.status);
    }
    if (res.status === 404) {
      throw new PanelApiError('Panel URL reachable but endpoint not found — check the URL is correct.', res.status);
    }
    throw new PanelApiError(`Panel returned HTTP ${res.status}.`, res.status);
  }

  try {
    return await res.json();
  } catch {
    throw new PanelApiError('Panel returned a non-JSON response — check the panel URL is correct.', res.status);
  }
}

/** Follows Pterodactyl's `meta.pagination` until the last page, returning the combined `data` array. */
async function fetchAllPages(baseUrl, apiKey, path) {
  const results = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const separator = path.includes('?') ? '&' : '?';
    const response = await request(baseUrl, apiKey, `${path}${separator}per_page=${PAGE_SIZE}&page=${page}`);
    results.push(...(response.data ?? []));

    const pagination = response.meta?.pagination;
    const totalPages = Number(pagination?.total_pages);
    const currentPage = Number(pagination?.current_page);

    if (!pagination || !Number.isFinite(totalPages) || !Number.isFinite(currentPage) || currentPage >= totalPages) {
      break;
    }
    page += 1;
  }

  return results;
}

/** Pings the panel with a cheap, read-only request to confirm the URL + API key work. */
export async function testConnection(baseUrl, apiKey) {
  await request(baseUrl, apiKey, '/api/application/nodes?per_page=1');
}

/** Pulls servers, nodes (+ free allocation counts), nests/eggs, and users in one shot. */
export async function scanPanel(baseUrl, apiKey) {
  const [rawServers, rawNodes, rawNests, rawUsers] = await Promise.all([
    fetchAllPages(baseUrl, apiKey, '/api/application/servers?include=node,user,allocations,egg'),
    fetchAllPages(baseUrl, apiKey, '/api/application/nodes?include=allocations,location'),
    fetchAllPages(baseUrl, apiKey, '/api/application/nests?include=eggs'),
    fetchAllPages(baseUrl, apiKey, '/api/application/users'),
  ]);

  const servers = rawServers
    .filter((s) => s?.attributes)
    .map((s) => ({
      id: s.attributes.id,
      uuid: s.attributes.uuid,
      identifier: s.attributes.identifier,
      name: s.attributes.name,
      externalId: s.attributes.external_id ?? null,
      ownerId: s.attributes.user,
      nodeId: s.attributes.node,
      eggId: s.attributes.egg,
      limits: s.attributes.limits ?? null,
      suspended: !!s.attributes.suspended,
    }));

  const nodesRaw = rawNodes
    .filter((n) => n?.attributes)
    .map((n) => ({
      id: n.attributes.id,
      uuid: n.attributes.uuid,
      name: n.attributes.name,
      fqdn: n.attributes.fqdn,
      locationId: n.attributes.location_id,
      memory: n.attributes.memory,
      disk: n.attributes.disk,
      maintenanceMode: !!n.attributes.maintenance_mode,
    }));

  const nests = [];
  const eggs = [];
  for (const nest of rawNests) {
    if (!nest?.attributes) continue;
    nests.push({
      id: nest.attributes.id,
      uuid: nest.attributes.uuid,
      name: nest.attributes.name,
      description: nest.attributes.description ?? null,
    });

    const nestEggs = nest.attributes.relationships?.eggs?.data ?? [];
    for (const egg of nestEggs) {
      if (!egg?.attributes) continue;
      eggs.push({
        id: egg.attributes.id,
        uuid: egg.attributes.uuid,
        name: egg.attributes.name,
        nestId: egg.attributes.nest,
        dockerImage: egg.attributes.docker_image ?? null,
      });
    }
  }

  const nodes = nodesRaw.map((node) => {
    const rawNode = rawNodes.find((n) => n?.attributes?.id === node.id);
    const locationName = rawNode?.attributes?.relationships?.location?.attributes?.short ?? null;
    const allocations = rawNode?.attributes?.relationships?.allocations?.data ?? [];
    const freeAllocations = allocations.filter((a) => a?.attributes && !a.attributes.assigned).length;
    return { ...node, locationName, freeAllocations };
  });

  const users = rawUsers
    .filter((u) => u?.attributes)
    .map((u) => ({
      id: u.attributes.id,
      uuid: u.attributes.uuid,
      username: u.attributes.username,
      email: u.attributes.email,
      isAdmin: !!u.attributes.root_admin,
    }));

  return { servers, nodes, nests, eggs, users, scannedAt: Date.now() };
}

/** Reads a single egg's startup config + environment variable defaults. */
export async function getEggDetail(baseUrl, apiKey, nestId, eggId) {
  const res = await request(baseUrl, apiKey, `/api/application/nests/${nestId}/eggs/${eggId}?include=variables`);
  const attrs = res?.attributes;
  if (!attrs) {
    throw new PanelApiError('Panel returned an unexpected response while reading the egg.', 200);
  }

  const variables = attrs.relationships?.variables?.data ?? [];
  const environment = {};
  for (const variable of variables) {
    const varAttrs = variable?.attributes;
    if (!varAttrs) continue;
    environment[varAttrs.env_variable] = varAttrs.default_value ?? '';
  }

  return { id: attrs.id, dockerImage: attrs.docker_image, startup: attrs.startup, environment };
}

/** Finds the first unassigned allocation (ip:port) on a node, or null if the node is full. */
export async function getFreeAllocation(baseUrl, apiKey, nodeId) {
  const allocations = await fetchAllPages(baseUrl, apiKey, `/api/application/nodes/${nodeId}/allocations`);
  for (const allocation of allocations) {
    const attrs = allocation?.attributes;
    if (attrs && !attrs.assigned) {
      return { id: attrs.id, ip: attrs.ip, port: attrs.port };
    }
  }
  return null;
}

/**
 * Creates a server on the panel.
 * @param {object} opts - { name, userId, eggId, dockerImage, startup, environment, memory, disk, cpu, backups, allocationId }
 */
export async function createPanelServer(baseUrl, apiKey, opts) {
  const body = {
    name: opts.name,
    user: opts.userId,
    egg: opts.eggId,
    docker_image: opts.dockerImage,
    startup: opts.startup,
    environment: opts.environment,
    limits: {
      memory: opts.memory,
      swap: 0,
      disk: opts.disk,
      io: 500,
      cpu: opts.cpu,
    },
    feature_limits: {
      databases: 0,
      backups: opts.backups,
      allocations: 1,
    },
    allocation: { default: opts.allocationId },
  };

  const res = await fetch(`${baseUrl}/api/application/servers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail;
    if (res.status === 422 && detail) throw new PanelApiError(detail, res.status);
    if (res.status === 400 && detail) throw new PanelApiError(detail, res.status);
    if (res.status === 401 || res.status === 403) {
      throw new PanelApiError('API key rejected by panel (invalid or insufficient permissions).', res.status);
    }
    throw new PanelApiError(`Panel returned HTTP ${res.status}.`, res.status);
  }

  const attrs = json?.attributes;
  if (!attrs) {
    throw new PanelApiError('Panel returned an unexpected response while creating the server.', res.status);
  }

  return { id: attrs.id, uuid: attrs.uuid, identifier: attrs.identifier, name: attrs.name };
}

/**
 * Creates a panel (application) user.
 * @param {object} opts - { username, email, password }
 */
export async function createPanelUser(baseUrl, apiKey, { username, email, password }) {
  const res = await fetch(`${baseUrl}/api/application/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      username,
      password,
      first_name: username,
      last_name: 'User',
      root_admin: false,
    }),
  });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail;
    if (res.status === 422 && detail) throw new PanelApiError(detail, res.status);
    if (res.status === 401 || res.status === 403) {
      throw new PanelApiError('API key rejected by panel (invalid or insufficient permissions).', res.status);
    }
    throw new PanelApiError(`Panel returned HTTP ${res.status}.`, res.status);
  }

  const attrs = json?.attributes;
  if (!attrs) {
    throw new PanelApiError('Panel returned an unexpected response while creating the account.', res.status);
  }

  return { id: attrs.id, uuid: attrs.uuid, username: attrs.username, email: attrs.email };
}

/** Deletes a server. Treats 204 (deleted) and 404 (already gone) both as success. */
export async function deletePanelServer(baseUrl, apiKey, serverId) {
  const res = await fetch(`${baseUrl}/api/application/servers/${serverId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  });

  if (res.status === 204 || res.status === 202) return;

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new PanelApiError('API key rejected by panel (invalid or insufficient permissions).', res.status);
    }
    if (res.status === 404) {
      throw new PanelApiError('Server not found — it may have already been deleted.', res.status);
    }
    throw new PanelApiError(`Panel returned HTTP ${res.status}.`, res.status);
  }
}

/**
 * Updates a panel user's password (used for both initial delivery and manual regen).
 * @param {object} opts - { userId, username, email, password }
 */
export async function updatePanelUserPassword(baseUrl, apiKey, { userId, username, email, password }) {
  const res = await fetch(`${baseUrl}/api/application/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      username,
      password,
      first_name: username,
      last_name: 'User',
      root_admin: false,
    }),
  });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail;
    if (res.status === 422 && detail) throw new PanelApiError(detail, res.status);
    if (res.status === 401 || res.status === 403) {
      throw new PanelApiError('API key rejected by panel (invalid or insufficient permissions).', res.status);
    }
    if (res.status === 404) {
      throw new PanelApiError('Panel account not found — it may have been deleted on the panel.', res.status);
    }
    throw new PanelApiError(`Panel returned HTTP ${res.status}.`, res.status);
  }

  const attrs = json?.attributes;
  if (!attrs) {
    throw new PanelApiError('Panel returned an unexpected response while updating the password.', res.status);
  }

  return { id: attrs.id, uuid: attrs.uuid, username: attrs.username, email: attrs.email };
}
