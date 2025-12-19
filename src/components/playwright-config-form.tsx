'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings, Save, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { 
    getPlaywrightConfig, 
    updatePlaywrightConfig, 
    getAvailableEnvironments,
    type PlaywrightConfig 
} from '@/app/actions/playwright-config-actions';
import { useLocale } from '@/components/locale-context';

// Zod schema for playwright config form validation
const playwrightConfigSchema = z.object({
    baseLoginUrl: z.string().min(1, 'Login URL zorunludur').url('Geçerli bir URL giriniz'),
    username: z.string().min(1, 'Kullanıcı adı zorunludur'),
    password: z.string().min(1, 'Şifre zorunludur'),
});

type PlaywrightConfigFormValues = z.infer<typeof playwrightConfigSchema>;

export function PlaywrightConfigForm() {
    const { dictionary } = useLocale();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [environments, setEnvironments] = useState<string[]>(['dev']);
    const [selectedEnv, setSelectedEnv] = useState('dev');

    // React Hook Form setup with Zod validation
    const form = useForm<PlaywrightConfigFormValues>({
        resolver: zodResolver(playwrightConfigSchema),
        defaultValues: {
            baseLoginUrl: '',
            username: '',
            password: '',
        },
    });

    const { watch, setValue, handleSubmit, formState: { errors } } = form;
    const baseLoginUrl = watch('baseLoginUrl');
    const username = watch('username');
    const password = watch('password');

    useEffect(() => {
        loadEnvironments();
        loadConfig('dev');
    }, []);

    const loadEnvironments = async () => {
        try {
            const envs = await getAvailableEnvironments();
            setEnvironments(envs);
        } catch (error) {
            console.error('Failed to load environments:', error);
        }
    };

    const loadConfig = async (env: string) => {
        setLoading(true);
        try {
            const data = await getPlaywrightConfig(env);
            setValue('baseLoginUrl', data.baseLoginUrl || '');
            setValue('username', data.username || '');
            setValue('password', data.password || '');
            setSelectedEnv(env);
        } catch (error: any) {
            toast.error(error.message || dictionary.playwrightConfig.configLoadError);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: PlaywrightConfigFormValues) => {
        setSaving(true);
        try {
            await updatePlaywrightConfig({
                baseLoginUrl: data.baseLoginUrl,
                username: data.username,
                password: data.password,
                environment: selectedEnv,
            });
            toast.success(dictionary.playwrightConfig.configUpdated.replace('{env}', selectedEnv));
        } catch (error: any) {
            toast.error(error.message || dictionary.playwrightConfig.configUpdateError);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = handleSubmit(onSubmit);

    const handleEnvChange = (env: string) => {
        loadConfig(env);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        <CardTitle>{dictionary.playwrightConfig.title}</CardTitle>
                    </div>
                    <Select value={selectedEnv} onValueChange={handleEnvChange}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Environment" />
                        </SelectTrigger>
                        <SelectContent>
                            {environments.map((env) => (
                                <SelectItem key={env} value={env}>
                                    {env}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <CardDescription>
                    {dictionary.playwrightConfig.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span className="ml-2">{dictionary.playwrightConfig.loading}</span>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="baseLoginUrl">{dictionary.playwrightConfig.loginUrl} *</Label>
                            <Input
                                id="baseLoginUrl"
                                type="url"
                                placeholder="https://example.com/login"
                                value={baseLoginUrl}
                                onChange={(e) => setValue('baseLoginUrl', e.target.value)}
                            />
                            {errors.baseLoginUrl && <p className="text-xs text-destructive">{errors.baseLoginUrl.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">{dictionary.playwrightConfig.username} *</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="username"
                                    value={username}
                                    onChange={(e) => setValue('username', e.target.value)}
                                />
                                {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">{dictionary.playwrightConfig.password} *</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setValue('password', e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="w-full"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    {dictionary.playwrightConfig.saving}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {dictionary.playwrightConfig.save}
                                </>
                            )}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
