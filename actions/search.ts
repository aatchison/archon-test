"use server";

import { getUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  searchTasks as searchTasksQuery,
  getSearchSuggestions as getSuggestionsQuery,
  type SearchFilters,
  type SearchResults,
  type SearchSuggestion,
} from "@/lib/search";

export async function searchTasks(
  query: string,
  filters?: SearchFilters,
  page?: number,
): Promise<SearchResults> {
  const userId = await getUserId();
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 200) {
    return { tasks: [], total: 0 };
  }
  return searchTasksQuery(db, userId, trimmed, filters, page);
}

export async function getSearchSuggestions(
  query: string,
): Promise<SearchSuggestion[]> {
  const userId = await getUserId();
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 200) {
    return [];
  }
  return getSuggestionsQuery(db, userId, trimmed);
}
