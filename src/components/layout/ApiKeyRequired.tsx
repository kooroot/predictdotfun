"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ApiKeyRequired() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <CardTitle>API Key Required</CardTitle>
          </div>
          <CardDescription>
            Mainnet requires an API key to access the Predict.fun API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You need to configure your API key in the settings to use Mainnet features.
            Get your API key from the Predict.fun developer portal.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://dev.predict.fun"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get API Key
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
