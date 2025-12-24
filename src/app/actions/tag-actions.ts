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

    const response = await fetch(`${API_URL}/api/projects`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch project folders: ${errorText}`);
    }

    return response.json() as string[];
}

export async function getFilesByGroupAction(groupName: string) {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const response = await fetch(`${API_URL}/api/projects/${encodeURIComponent(groupName)}/features`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch files for group ${groupName}: ${errorText}`);
    }

    return response.json() as Promise<string[]>;
}
