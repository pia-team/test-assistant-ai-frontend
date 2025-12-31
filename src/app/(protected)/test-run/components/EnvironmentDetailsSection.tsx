"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Globe, Loader2, Eye, EyeOff } from "lucide-react";
import { Control } from "react-hook-form";

interface EnvironmentDetailsSectionProps {
  control: Control<any>;
  configLoading: boolean;
  isProcessing: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  dictionary: any;
  fullDict: any;
}

export function EnvironmentDetailsSection({
  control,
  configLoading,
  isProcessing,
  showPassword,
  setShowPassword,
  dictionary,
  fullDict,
}: EnvironmentDetailsSectionProps) {
  return (
    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
      <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <Globe className="w-3.5 h-3.5" />
        {fullDict.testRun?.environmentInfo || "Ortam Bilgileri"}
      </Label>
      {configLoading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          <FormField
            control={control}
            name="baseLoginUrl"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      value={String(field.value)}
                      placeholder="https://example.com/login"
                      className="h-9 text-xs bg-white dark:bg-slate-950 w-full"
                      disabled={isProcessing}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <span className="text-[10px] text-slate-400">URL</span>
                    </div>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      value={String(field.value)}
                      placeholder={
                        dictionary.testRun.username || "Kullanıcı Adı"
                      }
                      className="h-9 text-xs bg-white dark:bg-slate-950 w-full"
                      disabled={isProcessing}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        value={String(field.value)}
                        type={showPassword ? "text" : "password"}
                        placeholder={dictionary.testRun.password || "Şifre"}
                        disabled={isProcessing}
                        className="h-9 text-xs bg-white dark:bg-slate-950 pr-8 w-full"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-9 w-8 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
