"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Rocket, ExternalLink, XCircle, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Control, UseFormSetValue } from "react-hook-form";

interface EnvironmentProfileSectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  environments: any[];
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  profileSearch: string;
  setProfileSearch: (search: string) => void;
  isProcessing: boolean;
  setIsEnvModalOpen: (open: boolean) => void;
  ENV_OPTIONS: { value: string; label: string }[];
  BROWSER_OPTIONS: { value: string; label: string; icon: string }[];
  dictionary: any;
  fullDict: any;
}

export function EnvironmentProfileSection({
  control,
  setValue,
  environments,
  activeProfileId,
  setActiveProfileId,
  profileSearch,
  setProfileSearch,
  isProcessing,
  setIsEnvModalOpen,
  ENV_OPTIONS,
  BROWSER_OPTIONS,
  dictionary,
  fullDict,
}: EnvironmentProfileSectionProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase italic px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
              {dictionary.testRun.selectProfile || "Kayıtlı Profil Seçin"}
            </Label>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-tighter"
              onClick={() => router.push("/environments")}
            >
              {dictionary.testRun.manageAll || "Tümünü Yönet"}{" "}
              <ExternalLink className="w-2 h-2 ml-0.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {activeProfileId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 text-slate-400 hover:text-red-500"
                onClick={() => {
                  setActiveProfileId(null);
                  toast.info(
                    dictionary.testRun.profileDeselected ||
                      "Profil seçimi kaldırıldı",
                  );
                }}
              >
                <XCircle className="w-3 h-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-4 text-slate-400 hover:text-indigo-500"
              onClick={() => setIsEnvModalOpen(true)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Custom Searchable Select (Combobox) */}
        <div className="relative group">
          <Select
            value={activeProfileId || ""}
            onValueChange={(val) => {
              const profile = environments.find((e) => e.id === val);
              if (profile) {
                setActiveProfileId(profile.id);
                setValue("baseLoginUrl", profile.baseLoginUrl);
                setValue("username", profile.username);
                setValue("password", profile.password);
                setValue("env", profile.envKey);
                toast.info(
                  `${profile.name} ${dictionary.testRun.profileLoaded || "profili yüklendi"}`,
                );
              }
            }}
            disabled={isProcessing || environments.length === 0}
          >
            <SelectTrigger className="w-full h-11 text-xs bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 shadow-sm transition-all hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
              <div className="flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-indigo-500" />
                <SelectValue
                  placeholder={
                    environments.length > 0
                      ? dictionary.testRun.selectOrCreateProfile ||
                        "Bir profil seçin veya arayın..."
                      : dictionary.testRun.noProfiles || "Henüz profil yok"
                  }
                />
              </div>
            </SelectTrigger>
            <SelectContent className="min-w-[300px] p-0 shadow-2xl border-indigo-100">
              <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder={
                      dictionary.testRun.searchProfile || "Profil ara..."
                    }
                    className="h-8 pl-8 text-xs bg-white border-slate-200 focus:ring-indigo-500/20"
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                {environments
                  .filter((e) =>
                    e.name.toLowerCase().includes(profileSearch.toLowerCase()),
                  )
                  .map((e) => (
                    <SelectItem
                      key={e.id}
                      value={e.id}
                      className="cursor-pointer py-2 focus:bg-indigo-50 dark:focus:bg-indigo-900/40"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {e.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 bg-slate-100 text-slate-600 border-slate-200"
                        >
                          {e.envKey}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                {environments.length > 0 &&
                  environments.filter((e) =>
                    e.name.toLowerCase().includes(profileSearch.toLowerCase()),
                  ).length === 0 && (
                    <div className="px-4 py-8 text-center text-xs text-slate-400 italic">
                      {dictionary.testRun.noResultsFound || "Sonuç bulunamadı"}
                    </div>
                  )}
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase">
            {dictionary.testRun.environmentType || "Ortam Tipi"}
          </Label>
          <FormField
            control={control}
            name="env"
            render={({ field }) => (
              <FormItem>
                <Select
                  value={field.value as string}
                  onValueChange={field.onChange}
                  disabled={isProcessing}
                >
                  <FormControl>
                    <SelectTrigger className="w-full h-10 text-xs">
                      <SelectValue
                        placeholder={
                          dictionary.testRun.selectPlaceholder || "Seçiniz"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ENV_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              opt.value === "prod"
                                ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                : opt.value === "staging"
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                            }`}
                          />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase">
            {fullDict.testRun?.browser || "Tarayıcı"}
          </Label>
          <FormField
            control={control}
            name="browser"
            render={({ field }) => (
              <FormItem>
                <Select
                  value={field.value as string}
                  onValueChange={field.onChange}
                  disabled={isProcessing}
                >
                  <FormControl>
                    <SelectTrigger className="w-full h-10 text-xs">
                      <SelectValue
                        placeholder={
                          dictionary.testRun.selectPlaceholder || "Seçiniz"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BROWSER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{opt.icon}</span>
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
