"use client";

import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";

let apolloClient: ApolloClient | null = null;

function createApolloClient() {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
  });

  return new ApolloClient({
    link: from([httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Define field policies here when lists/pagination are added
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-first" },
      query: { fetchPolicy: "cache-first" },
      mutate: { errorPolicy: "all" },
    },
  });
}

export function getApolloClient(): ApolloClient {
  if (!apolloClient) {
    apolloClient = createApolloClient();
  }
  return apolloClient;
} 