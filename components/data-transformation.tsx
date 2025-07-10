"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Download, Upload, FileJson, FileText, Database, ArrowRightLeft, CheckCircle, AlertCircle } from "lucide-react"

type ExportFormat = "json" | "xml" | "csv" | "fhir"
type ImportFormat = "json" | "xml" | "csv" | "hl7" | "fhir"

interface TransformationJob {
  id: string
  type: "export" | "import"
  format: string
  status: "pending" | "processing" | "completed" | "error"
  progress: number
  messageCount: number
  createdAt: Date
  completedAt?: Date
  errorMessage?: string
}

export function DataTransformation() {
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json")
  const [importFormat, setImportFormat] = useState<ImportFormat>("json")
  const [transformationJobs, setTransformationJobs] = useState<TransformationJob[]>([])
  const [importData, setImportData] = useState("")
  const [exportOptions, setExportOptions] = useState({
    includeMetadata: true,
    flattenStructure: false,
    customMapping: false,
    dateFormat: "iso",
    encoding: "utf-8",
  })

  const handleExport = async () => {
    const jobId = `export_${Date.now()}`
    const newJob: TransformationJob = {
      id: jobId,
      type: "export",
      format: exportFormat,
      status: "processing",
      progress: 0,
      messageCount: selectedMessages.length,
      createdAt: new Date(),
    }

    setTransformationJobs([newJob, ...transformationJobs])

    try {
      const response = await fetch("/api/transform/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageIds: selectedMessages,
          format: exportFormat,
          options: exportOptions,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `hl7_export_${Date.now()}.${exportFormat}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        // Update job status
        setTransformationJobs((jobs) =>
          jobs.map((job) =>
            job.id === jobId ? { ...job, status: "completed", progress: 100, completedAt: new Date() } : job,
          ),
        )
      } else {
        throw new Error("Export failed")
      }
    } catch (error) {
      setTransformationJobs((jobs) =>
        jobs.map((job) => (job.id === jobId ? { ...job, status: "error", errorMessage: "Export failed" } : job)),
      )
    }
  }

  const handleImport = async () => {
    const jobId = `import_${Date.now()}`
    const newJob: TransformationJob = {
      id: jobId,
      type: "import",
      format: importFormat,
      status: "processing",
      progress: 0,
      messageCount: 0,
      createdAt: new Date(),
    }

    setTransformationJobs([newJob, ...transformationJobs])

    try {
      const response = await fetch("/api/transform/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: importData,
          format: importFormat,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setTransformationJobs((jobs) =>
          jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "completed",
                  progress: 100,
                  messageCount: result.messageCount,
                  completedAt: new Date(),
                }
              : job,
          ),
        )
        setImportData("")
      } else {
        throw new Error(result.error || "Import failed")
      }
    } catch (error) {
      setTransformationJobs((jobs) =>
        jobs.map((job) =>
          job.id === jobId
            ? { ...job, status: "error", errorMessage: error instanceof Error ? error.message : "Import failed" }
            : job,
        ),
      )
    }
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setImportData(text)
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "json":
        return <FileJson className="h-4 w-4" />
      case "xml":
        return <FileText className="h-4 w-4" />
      case "csv":
        return <Database className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "processing":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5" />
            <span>Data Transformation</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Export HL7 messages to JSON, XML, CSV or import data to create HL7 messages
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Export Messages</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="jobs">Transformation Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">
                        <div className="flex items-center space-x-2">
                          <FileJson className="h-4 w-4" />
                          <span>JSON</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="xml">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>XML</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4" />
                          <span>CSV</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="fhir">
                        <div className="flex items-center space-x-2">
                          <FileJson className="h-4 w-4" />
                          <span>FHIR JSON</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Export Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeMetadata}
                        onChange={(e) => setExportOptions({ ...exportOptions, includeMetadata: e.target.checked })}
                      />
                      <span className="text-sm">Include metadata</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.flattenStructure}
                        onChange={(e) => setExportOptions({ ...exportOptions, flattenStructure: e.target.checked })}
                      />
                      <span className="text-sm">Flatten structure</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.customMapping}
                        onChange={(e) => setExportOptions({ ...exportOptions, customMapping: e.target.checked })}
                      />
                      <span className="text-sm">Use custom field mapping</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label>Date Format</Label>
                  <Select
                    value={exportOptions.dateFormat}
                    onValueChange={(value) => setExportOptions({ ...exportOptions, dateFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iso">ISO 8601</SelectItem>
                      <SelectItem value="hl7">HL7 Format</SelectItem>
                      <SelectItem value="unix">Unix Timestamp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleExport} className="w-full" disabled={selectedMessages.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedMessages.length} Messages
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Message Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Select messages to export (showing recent messages)
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {/* Mock message list for selection */}
                    {[
                      { id: "1", name: "Patient Admission - John Doe", type: "ADT^A01" },
                      { id: "2", name: "Lab Results - Jane Smith", type: "ORU^R01" },
                      { id: "3", name: "Discharge Summary - Bob Johnson", type: "ADT^A03" },
                    ].map((message) => (
                      <label key={message.id} className="flex items-center space-x-2 p-2 border rounded">
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(message.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMessages([...selectedMessages, message.id])
                            } else {
                              setSelectedMessages(selectedMessages.filter((id) => id !== message.id))
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{message.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {message.type}
                          </Badge>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Import Format</Label>
                  <Select value={importFormat} onValueChange={(value: ImportFormat) => setImportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="hl7">HL7 Raw</SelectItem>
                      <SelectItem value="fhir">FHIR JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Import Method</Label>
                  <div className="flex space-x-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("file-import")?.click()}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                    <input
                      id="file-import"
                      type="file"
                      accept=".json,.xml,.csv,.hl7,.txt"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <Label>Data Preview</Label>
                  <Textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste your data here or upload a file..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                <Button onClick={handleImport} className="w-full" disabled={!importData.trim()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">Preview of data to be imported:</div>
                  {importData ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Data format appears valid</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Estimated messages: {importData.split("\n").filter((line) => line.trim()).length}
                      </div>
                      <div className="bg-muted p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                        {importData.substring(0, 500)}
                        {importData.length > 500 && "..."}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No data to preview</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Transformation Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transformationJobs.map((job) => (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getFormatIcon(job.format)}
                        <div>
                          <div className="font-medium">
                            {job.type === "export" ? "Export" : "Import"} - {job.format.toUpperCase()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {job.messageCount} messages • {job.createdAt.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            job.status === "completed"
                              ? "default"
                              : job.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {job.status}
                        </Badge>
                        {job.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {job.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                    </div>
                    {job.status === "processing" && (
                      <div className="mt-2">
                        <Progress value={job.progress} className="w-full" />
                      </div>
                    )}
                    {job.errorMessage && <div className="mt-2 text-sm text-red-600">{job.errorMessage}</div>}
                  </Card>
                ))}
                {transformationJobs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No transformation jobs yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
