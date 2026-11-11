import type { Query, QueryClient } from '@tanstack/react-query';

// These families use anonymous transports and contain no account-scoped data.
// Unknown families are private by default, even if someone prefixes them public.
const publicFamilies = new Set([
  'restaurants',
  'food-categories',
  'restaurant-page',
  'restaurant',
  'restaurant-menu',
  'category-suggestions',
  'menu-item',
  'ratings',
]);

export function clearIdentityCaches(client: QueryClient) {
  const privateQuery = (query: Query) => {
    const family = query.queryKey[1];
    return (
      query.queryKey[0] !== 'public' || typeof family !== 'string' || !publicFamilies.has(family)
    );
  };
  void client.cancelQueries({ predicate: privateQuery });
  client.removeQueries({ predicate: privateQuery });
  client.getMutationCache().clear();
}
