"use client";

import { useState } from "react";
import { MarketList } from "@/components/market/MarketList";
import { useMarkets, useCategories } from "@/hooks/api/useMarkets";
import { useApiKey } from "@/hooks/useApiKey";
import { ApiKeyRequired } from "@/components/layout/ApiKeyRequired";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export default function HomePage() {
  const { isConfigured, isRequired } = useApiKey();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "resolved" | "all">("active");

  const { data: categories } = useCategories();
  const { data: allMarkets, isLoading } = useMarkets({
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    status: status !== "all" ? status : undefined,
  });

  // Client-side search filtering
  const markets = allMarkets?.filter((market) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      market.title.toLowerCase().includes(searchLower) ||
      market.question?.toLowerCase().includes(searchLower) ||
      market.description?.toLowerCase().includes(searchLower)
    );
  });

  // Show API key required message if on mainnet without API key
  if (isRequired && !isConfigured) {
    return <ApiKeyRequired />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Prediction Markets</h1>
        <p className="text-muted-foreground">
          Trade on the outcome of future events
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory("all")}
        >
          All
        </Badge>
        {categories?.map((category) => (
          <Badge
            key={category.slug}
            variant={selectedCategory === category.slug ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.slug)}
          >
            {category.title}
          </Badge>
        ))}
      </div>

      {/* Markets Grid */}
      <MarketList markets={markets} isLoading={isLoading} />
    </div>
  );
}
