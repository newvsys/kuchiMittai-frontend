import SearchResultsPage from "@/components/SearchResultsPage";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function SearchPage({ searchParams }: Props) {
  return <SearchResultsPage searchParams={searchParams} />;
}