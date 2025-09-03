"use client";

import { ReactNode } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { getApolloClient } from "./apolloClient";

export default function ApolloProviderWrapper({ children }: { children: ReactNode }) {
  const client = getApolloClient();
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
} 