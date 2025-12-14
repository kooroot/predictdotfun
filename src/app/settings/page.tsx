"use client";

import { useState, useEffect } from "react";
import { useNetwork } from "@/providers/NetworkProvider";
import { useApiKey } from "@/hooks/useApiKey";
import { useAuth } from "@/providers/AuthProvider";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { shortenAddress } from "@/lib/utils/format";

export default function SettingsPage() {
  const { network, setNetwork, config } = useNetwork();
  const { apiKey, setApiKey, clearApiKey, isRequired } = useApiKey();
  const { isAuthenticated, logout } = useAuth();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const [inputApiKey, setInputApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (apiKey) {
      setInputApiKey(apiKey);
    }
  }, [apiKey]);

  const handleSaveApiKey = () => {
    if (!inputApiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    setApiKey(inputApiKey.trim());
    toast({
      title: "API Key Saved",
      description: "Your API key has been saved to local storage",
    });
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setInputApiKey("");
    toast({
      title: "API Key Removed",
      description: "Your API key has been removed from local storage",
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your trading preferences</p>
      </div>

      {/* Network Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Network</CardTitle>
          <CardDescription>
            Choose between Testnet and Mainnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Network Mode</Label>
              <p className="text-sm text-muted-foreground">
                {config.name} ({config.chainId})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={network === "testnet" ? "default" : "outline"}>
                Testnet
              </Badge>
              <Switch
                checked={network === "mainnet"}
                onCheckedChange={(checked) => setNetwork(checked ? "mainnet" : "testnet")}
              />
              <Badge variant={network === "mainnet" ? "default" : "outline"}>
                Mainnet
              </Badge>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 text-sm">
            <p>
              <strong>Testnet:</strong> No API key required. Perfect for testing.
            </p>
            <p className="mt-2">
              <strong>Mainnet:</strong> Requires an API key for full access.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Key Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API Key
            {isRequired && (
              <Badge variant={apiKey ? "default" : "destructive"}>
                {apiKey ? "Configured" : "Required"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isRequired
              ? "API key is required for Mainnet access"
              : "API key is optional for Testnet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your API key"
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleSaveApiKey}>Save</Button>
              {apiKey && (
                <Button variant="outline" onClick={handleClearApiKey}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {apiKey ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-500">API key is configured</span>
              </>
            ) : isRequired ? (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-500">API key is required for Mainnet</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">API key not set (optional for Testnet)</span>
              </>
            )}
          </div>

          <Button variant="outline" asChild className="w-full">
            <a
              href="https://dev.predict.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              Get API Key
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Wallet Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet</CardTitle>
          <CardDescription>Your connected wallet information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Connected Address</Label>
                  <p className="text-sm font-mono">{shortenAddress(address || "", 8)}</p>
                </div>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Authentication Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {isAuthenticated ? "Signed in with JWT" : "Not authenticated"}
                  </p>
                </div>
                {isAuthenticated ? (
                  <Button variant="outline" size="sm" onClick={logout}>
                    Sign Out
                  </Button>
                ) : (
                  <Badge variant="secondary">Not Signed In</Badge>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Connect your wallet using the button in the header
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Predict.fun Community Trading</strong>
          </p>
          <p>
            This is an unofficial community-built trading interface for Predict.fun
            prediction markets.
          </p>
          <p className="text-xs">
            API Base URL: {config.baseUrl}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
