"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Rocket, Globe, Plus } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface AddEnvironmentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  envForm: UseFormReturn<any>;
  onEnvSubmit: (data: any) => void;
  ENV_OPTIONS: { value: string; label: string }[];
  dictionary: any;
}

export function AddEnvironmentDialog({
  isOpen,
  setIsOpen,
  envForm,
  onEnvSubmit,
  ENV_OPTIONS,
  dictionary,
}: AddEnvironmentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-6 h-6 text-indigo-500" />
            {dictionary.testRun.addProfileTitle || "Yeni Ortam Profili Ekle"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {dictionary.testRun.addProfileDesc ||
              "Yeni bir test ortamı (domain) profili ekleyerek bilgileri kaydedebilirsiniz."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-slate-100 dark:bg-slate-800" />

        <Form {...envForm}>
          <form
            onSubmit={envForm.handleSubmit(onEnvSubmit)}
            className="space-y-4 py-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={envForm.control}
                name="envKey"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">
                      {dictionary.testRun.environmentType || "Ortam Tipi"}
                    </Label>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 transition-all border-slate-200 focus:ring-indigo-500 focus:border-indigo-500">
                          <SelectValue
                            placeholder={
                              dictionary.testRun.selectPlaceholder ||
                              "Seçiniz..."
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ENV_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="focus:bg-indigo-50"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={envForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">
                      {dictionary.testRun.profileName || "Profil Adı"}
                    </Label>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Örn: Müşteri Paneli / Test"
                        className="h-10 border-slate-200"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={envForm.control}
              name="baseLoginUrl"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    {dictionary.testRun.domainUrl || "Domain (URL)"}
                  </Label>
                  <FormControl>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        {...field}
                        placeholder="https://test.example.com"
                        className="h-10 pl-9 border-slate-200"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={envForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">
                      {dictionary.testRun.username || "Kullanıcı Adı"}
                    </Label>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="test_user"
                        className="h-10 border-slate-200"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={envForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">
                      {dictionary.testRun.password || "Şifre"}
                    </Label>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="******"
                        className="h-10 border-slate-200"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 mt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                  envForm.reset();
                }}
                className="text-slate-500"
              >
                {dictionary.common.cancel || "İptal"}
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 mr-2" />
                {dictionary.testRun.saveProfile || "Profili Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
