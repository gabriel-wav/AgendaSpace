// Legacy compatibility wrapper forwarding to API instance
import { api } from '@/lib/api';

function createQueryChain(table: string, endpointParams: Record<string, any> = {}) {
  const chain: any = {
    then: (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
      return api
        .get(`/${table}`, { params: endpointParams })
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
          return { data, error: null, count: data.length };
        })
        .catch(() => {
          return { data: [], error: null, count: 0 };
        })
        .then(onfulfilled, onrejected);
    },
    catch: (onrejected?: (reason: any) => any) => chain.then(undefined, onrejected),
    single: () =>
      api
        .get(`/${table}`)
        .then((res) => ({ data: Array.isArray(res.data) ? res.data[0] || null : res.data, error: null }))
        .catch(() => ({ data: null, error: null })),
  };

  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'like', 'ilike', 'order', 'limit', 'range'];

  for (const method of methods) {
    chain[method] = (...args: any[]) => {
      if (method === 'eq' && args[0] && args[1] !== undefined) {
        endpointParams[args[0]] = args[1];
      }
      return chain;
    };
  }

  return chain;
}

export const supabase = {
  from: (table: string) => ({
    select: (query?: string) => createQueryChain(table),
    insert: (data: any) =>
      api
        .post(`/${table}`, data)
        .then((res) => ({ data: res.data, error: null }))
        .catch(() => ({ data: null, error: null })),
    update: (data: any) => ({
      eq: (field: string, val: any) =>
        api
          .patch(`/${table}/${val}`, data)
          .then((res) => ({ data: res.data, error: null }))
          .catch(() => ({ data: null, error: null })),
    }),
    delete: () => ({
      eq: (field: string, val: any) =>
        api
          .delete(`/${table}/${val}`)
          .then((res) => ({ data: res.data, error: null }))
          .catch(() => ({ data: null, error: null })),
    }),
  }),
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: File) => Promise.resolve({ data: { path }, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
    }),
  },
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
};
