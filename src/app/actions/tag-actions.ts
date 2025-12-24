"use server";

import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8093";

export async function getProjectsAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const response = await fetch(`${API_URL}/api/tags/projects`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch projects: ${errorText}`);
    }

    return response.json() as Promise<string[]>;
}

export async function getAllTagsAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const response = await fetch(`${API_URL}/api/tags`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch tags: ${errorText}`);
    }

    return response.json() as Promise<string[]>;
}

export async function getTagsByProjectAction(project: string) {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const response = await fetch(`${API_URL}/api/tags/${project}`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch tags for project ${project}: ${errorText}`);
    }

    return response.json() as Promise<string[]>;
}
export async function getProjectFoldersAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const response = await fetch(`${API_URL}/api/playwright-config/folders`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch project folders: ${errorText}`);
    }

    const data = await response.json();
    return data.folders as string[];
}
