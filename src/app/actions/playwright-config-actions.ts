'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Standard Playwright config with exactly 3 fields.
 * DO NOT add additional fields - keep config universal.
 */
export interface PlaywrightConfig {
    baseLoginUrl: string;
    username: string;
    password: string;
}

export interface PlaywrightConfigRequest extends PlaywrightConfig {
    environment?: string;
}

export async function getPlaywrightConfig(environment: string = 'dev'): Promise<PlaywrightConfig> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    const response = await fetch(`${API_URL}/api/playwright-config?environment=${environment}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to get config' }));
        throw new Error(error.message || 'Failed to get config');
    }

    return response.json();
}

export async function updatePlaywrightConfig(config: PlaywrightConfigRequest): Promise<{ success: boolean; message: string; config?: PlaywrightConfig }> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    const response = await fetch(`${API_URL}/api/playwright-config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(config),
    });

    const text = await response.text();
    
    if (!response.ok) {
        let errorMessage = 'Failed to update config';
        try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    if (!text) {
        return { success: true, message: 'Config updated' };
    }

    try {
        return JSON.parse(text);
    } catch {
        return { success: true, message: 'Config updated' };
    }
}

export async function getAvailableEnvironments(): Promise<string[]> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    const response = await fetch(`${API_URL}/api/playwright-config/environments`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        return ['dev'];
    }

    const data = await response.json();
    return data.environments || ['dev'];
}
