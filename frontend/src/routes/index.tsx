import { QueryClient } from '@tanstack/react-query';
import { RouteObject, createBrowserRouter } from 'react-router-dom';

import { NotFound } from '~/routes/not-found';

const routes = (_queryClient: QueryClient): RouteObject[] => [
  {
    path: '/*',
    async lazy() {
      const { Root: Component } = await import('~/routes/root');
      return { Component };
    },
    children: [
      {
        index: true,
        async lazy() {
          const { MyBadges: Component } = await import('~/routes/my-badges');
          return { Component };
        },
      },
      {
        path: 'badges-given',
        async lazy() {
          const { BadgesGiven: Component } = await import('~/routes/badges-given');
          return { Component };
        },
      },
      {
        path: 'badge-types',
        async lazy() {
          const { BadgeTypeLibrary: Component } = await import('~/routes/badge-types');
          return { Component };
        },
      },
      {
        path: 'badge-types/:typeId',
        async lazy() {
          const { BadgeTypeDetail: Component } = await import('~/routes/badge-type-detail');
          return { Component };
        },
      },
      {
        path: 'admin',
        async lazy() {
          const { BadgesAdmin: Component } = await import('~/routes/badges-admin');
          return { Component };
        },
      },
      {
        path: 'statistics',
        async lazy() {
          const { Statistics: Component } = await import('~/routes/statistics');
          return { Component };
        },
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
];

export const basename = import.meta.env.PROD ? '/minibadge' : '/';

export const router = (queryClient: QueryClient) =>
  createBrowserRouter(routes(queryClient), {
    basename,
  });
