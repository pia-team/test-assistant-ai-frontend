"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateTestsAction } from "@/app/actions/test-actions";

interface UploadJsonClientProps {
    dictionary: {
        uploadJson: {
            title: string;
            subtitle: string;
            dropzone: string;
            generate: string;
            generating: string;
        };
        common: {
            error: string;
            success: string;
        };
    };
}

export function UploadJsonClient({ dictionary }: UploadJsonClientProps) {
    const [jsonSchema, setJsonSchema] = useState<string>("");
    const [fileName, setFileName] = useState<string>("");
    const [hasFeatureFile, setHasFeatureFile] = useState(true);
    const [hasAPITests, setHasAPITests] = useState(true);
    const [hasTestPayload, setHasTestPayload] = useState(false);
    const [hasSwaggerTest, setHasSwaggerTest] = useState(false);
    const [result, setResult] = useState<string>("");

    const generateMutation = useMutation({
        mutationFn: generateTestsAction,
        onSuccess: (data) => {
            setResult(JSON.stringify(data, null, 2));
            toast.success(dictionary.common.success);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                JSON.parse(content); // Validate JSON
                setJsonSchema(content);
            } catch {
                toast.error("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                JSON.parse(content);
                setJsonSchema(content);
            } catch {
                toast.error("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    }, []);

    const handleGenerate = () => {
        if (!jsonSchema) return;
        generateMutation.mutate({
            jsonSchema,
            hasFeatureFile,
            hasAPITests,
            hasTestPayload,
            hasSwaggerTest,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{dictionary.uploadJson.title}</h1>
                <p className="text-muted-foreground">{dictionary.uploadJson.subtitle}</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">JSON Schema</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Dropzone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                id="file-upload"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center gap-3">
                                    {fileName ? (
                                        <>
                                            <FileJson className="w-12 h-12 text-primary" />
                                            <span className="font-medium">{fileName}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-12 h-12 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                                {dictionary.uploadJson.dropzone}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Switch checked={hasFeatureFile} onCheckedChange={setHasFeatureFile} />
                                <Label>Feature File</Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch checked={hasAPITests} onCheckedChange={setHasAPITests} />
                                <Label>API Tests</Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch checked={hasTestPayload} onCheckedChange={setHasTestPayload} />
                                <Label>Test Payload</Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch checked={hasSwaggerTest} onCheckedChange={setHasSwaggerTest} />
                                <Label>Swagger Test</Label>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerate}
                            disabled={generateMutation.isPending || !jsonSchema}
                            className="w-full gap-2"
                            size="lg"
                        >
                            {generateMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {dictionary.uploadJson.generating}
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    {dictionary.uploadJson.generate}
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Result Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Generated Output</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] w-full rounded-lg border bg-muted/30 p-4">
                            {result ? (
                                <pre className="text-sm font-mono whitespace-pre-wrap">{result}</pre>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <FileJson className="w-12 h-12 mb-4 opacity-30" />
                                    <p>Output will appear here</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
